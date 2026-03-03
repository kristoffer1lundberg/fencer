# Brief

I want to create a plugin that both works in node and javascript - so server and client.

It's a plugin that does reads the markdown input and transforms it before render.
It needs to do two things:

1. Convert a certain markdown syntax to json object
2. Pass that json object to a function that decides on how to render the information. How it is rendered would depend on the framework you are using - whether is vanilla html/css or react, etc.

For step 1, I want this plugin to react to everything that is within a ```component ``` section. What's within it should be structured with YAML. So an example would be:

```component
title: A title here
type: factBox
text: Something here
```

It should be possible to pass a zod schema into the plugin, so it can also validate our component data against it. This can be optional.

For step 2 - we basically just need a function that let's us decide how to render the information we have received after the transform from ```component ``` to normal JSON.
