
# Azure Container Apps — Manual Deployment Rollback

## Purpose

This document describes the proposed manual recovery procedure for failed deployments of the Y STEM & Chess application.

The deployment workflow updates five Azure Container Apps:

- ystem-middleware
- ystem-chessserver
- ystem-stockfish
- ystem-chessclient
- ystem-frontend

## Before Deployment

1. Confirm the existing production services are healthy.
2. Record the currently configured image for each service using the "Record images before deployment" step in the deployment workflow.
3. Record the active revisions and traffic allocations for all five applications.
4. Confirm that the previous working images remain available in GHCR.

## If Deployment Fails

1. Stop further deployment attempts and notify the deployment owner.
2. Identify which services were updated before the failure.
3. Inspect the revision history and traffic allocation for each affected Azure Container App.
4. Determine the last known healthy revision or image.
5. With deployment-owner approval, restore the previous healthy revision and its traffic allocation where supported, or redeploy the previous working image.
6. Check application logs for errors.

## Verify Recovery

Run the existing frontend and middleware smoke tests:

```bash
curl --fail --retry 5 --retry-delay 10 \
  https://ystem-frontend.proudglacier-1911e147.westus2.azurecontainerapps.io/

curl --fail --retry 5 --retry-delay 10 \
  https://ystem-middleware.proudglacier-1911e147.westus2.azurecontainerapps.io/
```

Also verify the chess server, Stockfish, and chess client using their appropriate health checks.

## Important Notes

- Only authorized deployment owners should perform production rollbacks.
- The correct rollback method depends on Azure Container Apps revision mode and traffic configuration.
- The image-recording workflow step captures configured images, not necessarily all active revisions or traffic weights.
- Do not enable automatic deployments until the planned health gate and traffic-revert functionality are implemented.
- This procedure requires review and validation by Amed or Everett before production use.
