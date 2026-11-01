/** Images, which esbuild inlines into main.js as data URLs: a release ships no other files. */
declare module "*.webp" {
  const url: string;
  export default url;
}
