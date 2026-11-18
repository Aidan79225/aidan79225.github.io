// A markdown image (`![alt](/images/…)`) leaves Astro as a bare <img src alt>:
// the file sits in public/, so Astro's image pipeline never sees it. This
// rehype plugin gives every such <img> what a hand-written one would carry:
//   - loading="lazy" + decoding="async": a chapter of the novel shows several
//     illustrations, and none should be fetched before the reader gets to it.
//   - width/height read from the file in public/ (image-size.mjs), so the
//     browser reserves the space and the text does not jump when it arrives.
// Attributes already on the element (set by an earlier plugin) are left alone.
//
// Only images written in markdown syntax are elements at this point. An <img>
// typed as HTML in a post is still a raw node here (rehype-raw runs after the
// user plugins), so it must carry its own loading/width/height.
import { publicImageSize } from './image-size.mjs';

function eachElement(node, fn) {
  if (node.type === 'element') fn(node);
  for (const child of node.children ?? []) eachElement(child, fn);
}

export default function rehypeImg({ publicDir } = {}) {
  return (tree) => {
    eachElement(tree, (node) => {
      if (node.tagName !== 'img') return;
      const props = (node.properties ??= {});
      props.loading ??= 'lazy';
      props.decoding ??= 'async';
      if (props.width == null && props.height == null && typeof props.src === 'string') {
        const size = publicImageSize(props.src, publicDir);
        if (size) {
          props.width = size.width;
          props.height = size.height;
        }
      }
    });
  };
}
