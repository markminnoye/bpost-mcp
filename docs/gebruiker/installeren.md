# Installeren

Je koppelt de bpost-dienst één keer aan je AI-assistent. Daarna kan je gewoon vragen om een adressenlijst klaar te zetten.

{% hint style="info" %}
De dienst staat nog in een vroege alfaversie. Werk bij bpost in **testmodus** tot alles goed werkt.
{% endhint %}

## Wat heb je nodig?

- Een AI-assistent die externe koppelingen ("connectors") toelaat: Claude Desktop, Claude Code of claude.ai.
- Een Google-account voor de eerste aanmelding.

Je hebt geen wachtwoord of token nodig. Bij de eerste opdracht opent de assistent vanzelf een inlogpagina.

## Stappen in Claude Desktop of claude.ai

1. Klik links op **Customize** en ga naar **Connectors**.
2. Klik op **Add custom connector**.
3. Vul in:
   - **Naam:** BPost
   - **URL:** `https://bpost.sonicrocket.app/mcp`
4. Klik op **Add** en meld je aan wanneer de assistent daarom vraagt.

Een gratis claude.ai-plan laat geen eigen connectors toe. Gebruik dan het dashboard op `https://bpost.sonicrocket.app/dashboard`.

## Stappen in Claude Code

```bash
claude mcp add bpost --url https://bpost.sonicrocket.app/mcp
```

Bij de eerste bpost-opdracht volgt een aanmelding in de browser.

## Je bpost-gegevens invullen

Ga naar het dashboard (`/dashboard`). Onder **BPost-gegevens** vul je je bpost-login en klantnummers in. Onder **Barcode-instellingen** kies je wie de barcodes aanmaakt.

## Testen

Vraag aan de assistent: "Help me een adresbestand voor te bereiden voor bpost." Lukt dat, dan is alles in orde.

## Volgende stap

[Adressen versturen](adressen-versturen.md)

{% hint style="warning" %}
Staat de dienst op een ander adres (bijvoorbeeld een testomgeving)? Vervang dan `https://bpost.sonicrocket.app` door dat adres.
{% endhint %}
