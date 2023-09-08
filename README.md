# watchlist
Example application for flask tutorial

## Init

`flask admin` to set username and password

## Install an ingress in K8s cluster

```
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install nginx-ingress ingress-nginx/ingress-nginx --create-namespace --namespace ingress-nginx
```