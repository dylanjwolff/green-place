# green-place
Find green places

# HOW TO BUILD

I added a webpack configuration so that we can use npm-modules (and also so we can easily divide stuff into separate files to avoid merge conflicts).

You need npm installed locally

first, do ```npm install``` in the directory containing package.json

then do ```npm run build``` to generate dist/bundle.js, which takes everything imported from main and throws it into one big "bundled" file that the manifest of the extension then actually uses
