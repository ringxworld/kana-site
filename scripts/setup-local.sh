#!/usr/bin/env bash
# Bootstrap kana-site local stack: k3d + nginx-ingress + Ollama (qwen2.5:3b) + kana-site.
# Prerequisites: k3d, kubectl, helm
set -euo pipefail

CLUSTER=kana
NAMESPACE=kana
MODEL=qwen2.5:3b

# ── 1. k3d cluster ────────────────────────────────────────────────────────────
if k3d cluster list | grep -q "^${CLUSTER}"; then
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
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.service.type=NodePort \
  --wait --timeout 120s

# ── 3. Ollama ─────────────────────────────────────────────────────────────────
echo "[helm] installing Ollama"
helm repo add ollama-helm https://otwld.github.io/ollama-helm/ 2>/dev/null || true
helm repo update
helm upgrade --install ollama ollama-helm/ollama \
  --namespace "${NAMESPACE}" --create-namespace \
  -f helm/ollama/values.yaml \
  --wait --timeout 180s

echo "[ollama] pulling model ${MODEL} (first run may take a few minutes)"
kubectl exec -n "${NAMESPACE}" deploy/ollama -- ollama pull "${MODEL}"

# ── 4. kana-site manifests ────────────────────────────────────────────────────
echo "[kubectl] applying kana-site manifests"
kubectl apply -f k8s/

# ── 5. /etc/hosts ─────────────────────────────────────────────────────────────
if grep -q "kana.local" /etc/hosts; then
  echo "[hosts] kana.local already present"
else
  echo "[hosts] adding kana.local → 127.0.0.1"
  echo "127.0.0.1  kana.local" | sudo tee -a /etc/hosts
fi

echo ""
echo "✓ kana-site: http://kana.local"
echo "✓ API:       http://kana.local/api/v1/sentences/enrich"
echo "✓ Ollama:    http://ollama.${NAMESPACE}.svc.cluster.local:11434 (cluster-internal)"
