# Flask Watchlist Helm Chart

Minimal Kubernetes deployment configuration with all values fixed, no complex setup required.

## Quick Start

### Install
```bash
helm install flask-watchlist ./flask-watchlist
```

### Scale replicas
```bash
helm install flask-watchlist ./flask-watchlist \
  --set replicaCount=3
```

### Use different image
```bash
helm install flask-watchlist ./flask-watchlist \
  --set image.tag=v1.0.0
```

### Custom domain
```bash
helm install flask-watchlist ./flask-watchlist \
  --set ingress.host=your-domain.com
```

## Included Resources

- **Deployment**: Flask Watchlist application (1 replica by default)
- **Service**: Routes traffic to Pods
- **Ingress**: External access entry point (flask-watchlist.fullstackjam.com)

## Fixed Configuration

- **Application Name**: `flask-watchlist`
- **Port**: `80`

## Configurable Options

| Parameter | Default | Description |
|-----------|---------|-------------|
| `replicaCount` | `1` | Number of Pod replicas |
| `image.repository` | `fullstackjam/flask-watchlist` | Image repository |
| `image.tag` | `latest` | Image tag |
| `ingress.host` | `flask-watchlist.fullstackjam.com` | Access domain |

## Uninstall

```bash
helm uninstall flask-watchlist
```
