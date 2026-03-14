#!/usr/bin/env bash
# Bootstrap kotoba-lab local stack: k3d cluster + nginx ingress + Ollama (qwen2.5:3b) + kotoba-lab.
#
# Prerequisites (install once):
#   winget install k3d Kubernetes.kubectl Helm.Helm
#
# Usage:
#   bash scripts/setup-local.sh
set -euo pipefail

CLUSTER=kotoba
NAMESPACE=kotoba
MODEL=qwen2.5:3b

# ── 1. k3d cluster ────────────────────────────────────────────────────────────
if k3d cluster list 2>/dev/null | grep -q "^${CLUSTER}"; then
  echo "[k3d] cluster '${CLUSTER}' already exists, skipping create"
else
  echo "[k3d] creating cluster '${CLUSTER}'"
  k3d cluster create "${CLUSTER}" \
    --agents 1 \
    --k3s-arg '--disable=traefik@server:*' \
    -p "80:80@loadbalancer"
fi

# ── 2. nginx ingress controller ───────────────────────────────────────────────
echo "[helm] installing nginx ingress controller"
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>/dev/null || true
helm repo update ingress-nginx
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.service.type=NodePort \
  --wait --timeout 120s

# ── 3. Ollama ─────────────────────────────────────────────────────────────────
echo "[helm] installing Ollama"
helm repo add ollama-helm https://otwld.github.io/ollama-helm/ 2>/dev/null || true
helm repo update ollama-helm
helm upgrade --install ollama ollama-helm/ollama \
  --namespace "${NAMESPACE}" --create-namespace \
  -f helm/ollama/values.yaml \
  --wait --timeout 300s

echo "[ollama] pulling model ${MODEL} (first run: ~2 GB download)"
kubectl exec -n "${NAMESPACE}" deploy/ollama -- ollama pull "${MODEL}"

# ── 4. Build + import kotoba images ────────────────────────────────────────────
echo "[docker] building kotoba-server:local"
docker build -t kotoba-server:local -f docker/Dockerfile.server .

echo "[docker] building kotoba-client:local"
docker build -t kotoba-client:local -f docker/Dockerfile.client .

echo "[k3d] importing images into cluster '${CLUSTER}'"
k3d image import kotoba-server:local kotoba-client:local -c "${CLUSTER}"

# ── 5. kotoba-lab manifests ────────────────────────────────────────────────────
echo "[kubectl] applying kotoba-lab manifests"
kubectl apply -f k8s/

# ── 6. /etc/hosts ─────────────────────────────────────────────────────────────
if grep -q "kotoba.local" /etc/hosts 2>/dev/null; then
  echo "[hosts] kotoba.local already present"
else
  echo "[hosts] adding 127.0.0.1  kotoba.local — may prompt for sudo password"
  echo "127.0.0.1  kotoba.local" | sudo tee -a /etc/hosts
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "✓ kotoba-lab:  http://kotoba.local"
echo "✓ API:        http://kotoba.local/api/v1/sentences/enrich"
echo "✓ Ollama:     ollama.${NAMESPACE}.svc.cluster.local:11434 (cluster-internal)"
echo ""
echo "Tampermonkey script is ready — install extension/tampermonkey/kotoba-capture.user.js"
echo "Select any Japanese text on a page and click '+ Kana'"
