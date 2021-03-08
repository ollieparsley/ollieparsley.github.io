---
title: Statsd + Prometheus on Grafana Cloud
date: 2021-03-08 23:00:00 +/-0100
categories: [how-to]
tags: [grafana,prometheus,statsd]
---

<div style="text-align:center;max-width:400px;margin:0 auto;margin-bottom:10px;"><img src="https://cdn.thenewstack.io/media/2021/01/cb356f21-screenshot-2021-01-11-124905-1024x536.png" /></div>

On the 12th January 2021, [Grafana Labs announced](https://grafana.com/blog/2021/01/12/the-new-grafana-cloud-the-only-composable-observability-stack-for-metrics-logs-and-traces-now-with-free-and-paid-plans-to-suit-every-use-case/?plcmt=footer) an updated version of Grafana Cloud. The most important part of the announcement for me was the fact that there is a new plan that’s actually free. Just to confirm, this is not an advert of paid promotion, I was genuinely excited about this!

As soon as I saw the announcement I got to work on updating my own metric use within my pet projects. I've pretty-much only used Statsd for metrics in my own projects, but I also use Prometheus in my day job.

## Grafana cloud free account limitations

If you're thinking about using Grafana Cloud for free then you should be aware of the [limitations of free accounts](https://grafana.com/get/).

* 10,000 series for Prometheus or Graphite metrics
* 50 GB of logs
* 14 day retention for metrics and logs
* Access for up to 3 team members

## Security and privacy concerns

The first thing that might cross your mind is questioning whether it is safe to put your metrics into the cloud. Well, I have a couple of thoughts on that.

1. **Trust** Obviously the first thing is that you need to have a level of trust with the place you're sending metrics. For me, purely based on my interactions with the open-source Grafana and their Github issues.

2. **PII** I would make sure to not send any personally identifiable information. I'd certainly not even do that if my metrics were stored on-premise or my own cluster.

3. **Authentication** The transport for sending metrics must have both authentication and encryption

Let's take a look at what I discovered and see if that was enough to alleviate my concerns


## Statsd or Prometheus

One important point to note is that there is no Grafana Cloud Statsd server to send metrics to. Even if there was, there isn't much support for authentication and encryption with Statsd either. That's fine in an on-premise solution or a cluster that you own, but when sending metrics into the cloud, there must be a better option.

The ideal solution would be a way for me to send Statsd metrics, get them converted to Prometheus and then use the `remote_write` functionality that is built-in to Prometheus. This is when I discovered the [Statsd Prometheus Exporter](https://github.com/prometheus/statsd_exporter).

## Statsd to Prometheus

The exporter is a Statsd server that exports metrics on a `/metrics` endpoint. The beauty of this is that all I'd have to do is deploy the exporter to Kubernetes, then change the host that I'm sending metrics to. Bish, bash, bosh!

Now that's an easy way to convert from Statsd to Prometheus, but it doesn't get the best out of either metric type. The beauty of prometheus is the metric name and labelling, but with Statsd there are no labels. If I wanted to add more context to a Statsd metric I need to add it to the key name, which is just not the way to do it with Prometheus.

Luckily the [Statsd Prometheus Exporter](https://github.com/prometheus/statsd_exporter) has [4 awesome tagging/labelling extensions](https://github.com/prometheus/statsd_exporter#tagging-extensions) to the Statsd metric protocol which allowed me to also send metrics.

## Hybrid metrics client

In order to make my own metric implementation easier I created a simple Metrics interface in Golang which I then implemented a "Hybrid" metric type.

### Metrics interface

```
package metrics

//ClientInterface ...
type ClientInterface interface {
	Init() error
	Increment(key string, labels map[string]string)
	IncrementBy(key string, by int, labels map[string]string)
	Gauge(key string, value int, labels map[string]string)
}
```

### Hybrid implementation

The "Hybrid" type is what I call the Statsd + labels solution. You can see from the interface that I'm only implementing a couple of metric types: Increment and Gauge. Each one takes a key, a value and a string to string map of labels. This is the statsd hybrid implementation:

```
package metrics

import (
	"fmt"
	"strings"
	"time"

	"github.com/alexcesaro/statsd"
)

// Hybrid metrics
type Hybrid struct {
	Statsd       StatsdConfig
	Client       *statsd.Client
	AttachLabels bool
}

// StatsdConfig ...
type StatsdConfig struct {
	Host   string
	Prefix string
}

// Init ...
func (m *Hybrid) Init() error {
	// Set up the statsd client
	client, err := statsd.New(
		statsd.Address(m.Statsd.Host),
		statsd.Prefix(m.Statsd.Prefix),
		statsd.FlushPeriod(time.Second*1),
	)
	if err != nil {
		return fmt.Errorf("Hybrid: Could not connect to %s: %s", m.Statsd.Host, err.Error())
	}
	m.Client = client
	return nil
}

// Format key with labels
func (m *Hybrid) formatKeyWithLabels(key string, labels map[string]string) string {
	// Do we want to attach labels?
	if m.AttachLabels == false {
		return key
	}

	// Use librato-style tags
	// metrim.name#tagName=val,tag2Name=val2:0|c
	// https://github.com/prometheus/statsd_exporter#tagging-extensions
	if len(key) == 0 {
		return key
	}
	formattedLabels := []string{}
	for labelKey, labelVal := range labels {
		formattedLabels = append(formattedLabels, fmt.Sprintf("%s=%s", labelKey, labelVal))
	}
	joinedFormattedLabels := strings.TrimSpace(strings.Join(formattedLabels, ","))
	if joinedFormattedLabels != "" {
		key = fmt.Sprintf("%s#%s", key, joinedFormattedLabels)
	}

	return strings.Trim(key, "#")
}

// Increment ...
func (m *Hybrid) Increment(key string, labels map[string]string) {
	m.IncrementBy(key, 1, labels)
}

// IncrementBy ...
func (m *Hybrid) IncrementBy(key string, by int, labels map[string]string) {
	updatedKey := m.formatKeyWithLabels(key, labels)
	if m.Client != nil {
		m.Client.Count(updatedKey, by)
	}
}

// Gauge ...
func (m *Hybrid) Gauge(key string, value int, labels map[string]string) {
	updatedKey := m.formatKeyWithLabels(key, labels)
	if m.Client != nil {
		m.Client.Gauge(updatedKey, value)
	}
}
```

## Sending to Grafana Cloud

Now that I can get the metrics exported to Prometheus I can easily get them sent to Grafana Cloud using my existing Prometheus server running in my Kubernetes cluster.

All I need to do is add the following into my Prometheus scrape config:

```
remote_write:
- url: https://prometheus-us-central1.grafana.net/api/prom/push
  basic_auth:
    username: '<my-user-id-here>'
    password: '<my-auth-token-here>'

```

## Conclusion

My biggest concerns were the 3 that I listed at the top of this post.

1. **Trust**: Do I trust them? So far I have no reason not to trust them. It could be a flaw, but I may just trust too easily!

2. **PII** I went through all my code and removed PII from my metrics and used ID's instead where I needed, which is only a couple of occasions.

3. **Authentication** By choosing Prometheus as my way of storing and sending/receiving metrics, the built-in `remove_write` functionality includes both Authentication (basic auth) and Encryption (SSL).

With all 3 of my initial concerns alleviated, I'm very happy with the Grafana Cloud solution and the infrastructure savings by not having to host Grafana, statsd, graphite and other related service myself.

I don't have an affiliate link, but be sure to [sign up for an account](https://grafana.com/signup/cloud/connect-account?plcmt=sub-nav) to get free (but restricted) metrics infrastructure!
