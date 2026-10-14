# Middleware Node

## Where code goes

Route files handle HTTP only. Reusable or complex logic goes in `utils/` or a
domain `service.js` (for example, `badges/service.js`). There is no
`controllers/` layer.
