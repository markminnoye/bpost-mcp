[**bpost-mcp**](../README.md)

***

[bpost-mcp](../README.md) / BOX\_KEYWORDS

# Variable: BOX\_KEYWORDS

> `const` **BOX\_KEYWORDS**: readonly [`BoxKeyword`](../interfaces/BoxKeyword.md)[]

Box words the library recognises, in the order to show them. Extensible on purpose:
add entries here when Contrapunt (Frank) delivers the full practice list — do not wait
for it, and do not build tooling around it (SR-83 product decision, 6 okt 2026).

## Example

```ts
BOX_KEYWORDS // [{ keyword: 'bus', locale: 'nl' }, …]
```
