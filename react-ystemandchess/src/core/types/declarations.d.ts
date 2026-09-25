

declare module '*.svg' {
  const content: string;
  export default content;
}

// vite-plugin-svgr: `import Icon from './icon.svg?react'` yields a React component.
declare module '*.svg?react' {
  import * as React from 'react';
  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
  
  declare module "*.png" {
    const content: string;
    export default content;
  }
  
  declare module "*.jpg" {
    const content: string;
    export default content;
  }
  
  declare module "*.jpeg" {
    const content: string;
    export default content;
  }
  
  declare module "*.gif" {
    const content: string;
    export default content;
  }
  
