# Projectdossier Contrapunt × bpost e-MassPost

{% hint style="warning" %}
**Concept, ter nazicht.** Dit dossier is een eerste verzameling op basis van de projectopvolging tot 3 oktober 2026. Niets hierin is definitief tot Mark en Frank het samen hebben bevestigd.
{% endhint %}

{% hint style="info" %}
**Broncode is momenteel publiek.** De code staat in een publieke GitHub-repository, omdat dat gratis samenwerkt met de huidige hosting. Daardoor is het project in de praktijk open source: iedereen kan de code en de geschiedenis lezen. Zie [DEC-013](beslissingen.md) en [Q-011](open-vragen.md).
{% endhint %}

Dit is het gedeelde werkdocument van Contrapunt en Sonic Rocket. Het houdt bij wat we willen bouwen, wat we beslist hebben (en waarom) en wat nog openstaat. Het mag bijgesteld worden: als een requirement of beslissing verandert, markeren we de oude als vervangen of verlaten, zodat de geschiedenis zichtbaar blijft.

## Doel

Contrapunt-medewerkers zonder technische achtergrond laten werken met bpost e-MassPost: van adressenlijst tot gevalideerde mailing, met een eenvoudige tool die lokaal of intern gehost kan draaien. De eerste versie werkt zonder AI-assistent.

## Hoe lees je dit dossier

<table data-view="cards"><thead><tr><th></th><th></th><th></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody><tr><td><h3><i class="fa-list-check" style="color:$primary;">:list-check:</i></h3></td><td><strong>Requirements</strong></td><td>Wat het systeem moet kunnen (functioneel) en aan welke eisen het moet voldoen (niet-functioneel).</td><td><a href="requirements.md">requirements.md</a></td></tr><tr><td><h3><i class="fa-gavel" style="color:$primary;">:gavel:</i></h3></td><td><strong>Beslissingen</strong></td><td>Wat we gekozen hebben, waarom, en wat er vervangen of verlaten is.</td><td><a href="beslissingen.md">beslissingen.md</a></td></tr><tr><td><h3><i class="fa-circle-question" style="color:$primary;">:circle-question:</i></h3></td><td><strong>Open vragen</strong></td><td>Wat nog beantwoord moet worden, en wat erdoor geblokkeerd wordt.</td><td><a href="open-vragen.md">open-vragen.md</a></td></tr><tr><td><h3><i class="fa-diagram-project" style="color:$primary;">:diagram-project:</i></h3></td><td><strong>Architectuur</strong></td><td>De werkwijze en de onderdelen, met de fasen van het project.</td><td><a href="architectuur.md">architectuur.md</a></td></tr></tbody></table>

## Statussen

| Status        | Betekenis                                                         |
| ------------- | ----------------------------------------------------------------- |
| Voorgesteld   | Idee of voorstel, nog niet bevestigd door Contrapunt              |
| Besloten      | Samen bevestigd of door de meeting van 23 september vastgelegd    |
| Voorlopig     | Geldt voor de eerste versie (MVP), nog te testen of bij te sturen |
| Ter discussie | Er is een richting, maar ze staat nog open voor bijsturing        |
| Open          | Vraag of punt waarvoor nog een antwoord nodig is                  |
| Vervangen     | Niet meer van toepassing, met verwijzing naar wat het vervangt    |
| Verlaten      | Bewust niet meer gevolgd, kan later terugkomen                    |

## ID's

REQ-F = functionele requirement, REQ-N = niet-functionele requirement, DEC = beslissing, Q = open vraag. Zo kunnen we er in gesprekken en taken eenduidig naar verwijzen.
