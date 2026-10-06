# Aanmelden en tokens

{% hint style="warning" %}
Alfaversie. Dit onderdeel kan nog veranderen.
{% endhint %}

Twee manieren om de MCP-server en de beveiligde HTTP-routes aan te spreken. Beide leveren een `Authorization: Bearer <token>`-header.

| Situatie | Methode |
|---|---|
| Een AI-client die zelf inlogt | OAuth 2.1 met PKCE |
| Automatisering of een omgeving zonder browser | App-token uit het dashboard |

## OAuth (interactief)

1. De client haalt de metadata op:
   - `GET /.well-known/oauth-protected-resource`
   - `GET /.well-known/oauth-authorization-server`
2. De client registreert zich met `POST /oauth/register` (dynamic client registration). `client_secret` staat alleen in dat antwoord.
3. De client stuurt de gebruiker naar `GET /oauth/authorize` met `response_type=code`, `client_id`, `redirect_uri` en `code_challenge`. Regels:
   - PKCE is verplicht, alleen `code_challenge_method=S256`.
   - Enige ondersteunde scope: `mcp:tools`.
   - De `redirect_uri` moet bij registratie zijn opgegeven.
   - De code is 10 minuten geldig.
4. De gebruiker meldt zich aan via Google (Auth.js op `/api/auth/*`).
5. De client wisselt de code in bij `POST /oauth/token` (`application/x-www-form-urlencoded`, met `code_verifier`). Het antwoord bevat `access_token` (Bearer, 3600 seconden) en een `refresh_token`.
6. Verlengen kan met `grant_type=refresh_token`. Het refresh-token wordt bij elke ronde vervangen.

Toegangstokens worden ondertekend met de host van het verzoek. Tokens van een vorige host blijven geldig via `AUTH_ACCEPTED_ISSUERS`. Dat stelt de beheerder van de dienst in.



## App-token (headless)

Op `/dashboard` maak je onder de MCP-koppeling een app-token met een label. Gebruik het als Bearer-token. De HTTP-routes `POST /api/batches/upload` en `POST /api/masspost/suggest-mapping` aanvaarden ook een ingelogde sessie.

## Foutcodes

| Status | Betekenis |
|---|---|
| 401 | Geen, ongeldig of verlopen token, of verlopen sessie |
| 403 | Account is niet gekoppeld aan een bpost-tenant |
