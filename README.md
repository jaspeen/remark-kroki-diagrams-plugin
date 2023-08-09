# Remark diagrams plugin

Inserts diagrams from [Kroki](https://kroki.io/) into markdown files using code blocks.

Will turn diagrams like this

````md
```plantuml
A --> B
```
````

into image (svg/png) files or embedded data url.

Any diagram type can be used which supported by [Kroki](https://kroki.io/#support).

By using external file via 'src' option we can for example include particular view from c4 diagram:

````markdown
```plantuml src="diagrams/c4.dsl" opt-view-key="AllContainers" title="Context diagram"

```
````

## Usage

Supports only multiline code block like

````markdown
```kroki lang=plantuml type=png title="My diagram"
A --> B
```
````

#### Code block options:

- **lang** - specify diagram type. Required if main lang key instead of alias is used
- **src** - file with diagram source. Relative paths resolved against `diagramSourceDir` config (cwd by default)
- **type** - output image type. Supported values: `svg`, `png`, `jpg`. Default: `svg`
- **title** - diagram title
- **alt** - image alt text

## Configuration

### Plugin configuration options:

- **krokiServer** - url of kroki server. Default: `https://kroki.io`
- **mode** - `file` or `data-url`. Default: `file`
- **defaultImageType** - image type if not specified in option. Default: `svg`
- **diagramSourceDir** - where to find diagram source included from file
- **cacheDir** - directory with image cache
- **fileDir** - where generated diagram files will be stored
- **fileRefPrefix** - prefix for image on page; relative paths will be resolved against markdown page location, absolute paths against this param
- **lang** - main lang for this plugin. Default: `kroki`
- **aliases** - specify diagram types which will be processed by plugin if specified as lang. Default empty
- **includeSource** - put source as code element next to image. Default `false`
- **includedSourceClass** - CSS class for source code element
- **includedSourceStyle** - CSS style for source code element
- **includedSourceParentClass** - CSS class for source code element parent
- **includedSourceParentStyle** - CSS style for source code element parent
- **lenient** - do not fail on error response from kroki server. Default `false`

### Docusaurus

In docuzaurus

```js
beforeDefaultRemarkPlugins: [
  [
    require("remark-kroki-diagrams-plugin").default,
    {
      fileRefPrefix: "/img/kroki",
      fileDir: "static/img/kroki",
      cacheDir: ".docusaurus/remark-kroki-diagrams-plugin/cache",
      diagramSourceDir: "diagrams",
      aliases: ["structurizr", "plantuml"],
    },
  ],
],
```

### Astro

TBD

## Credits

Based on https://github.com/atooni/remark-kroki-plugin
