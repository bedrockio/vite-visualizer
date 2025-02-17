import { sumBy } from 'lodash-es';

export function getRings(root) {
  root = excludeTop(root);

  const depth = getRingDepth(root);

  let children = mapChildren(root);

  const newRings = [
    {
      ...root,
      children,
    },
  ];

  for (let i = 1; i < depth; i++) {
    children = children.flatMap((node) => {
      if (node.children) {
        return mapChildren(node);
      } else {
        return [
          {
            ...node,
            filler: true,
          },
        ];
      }
    });

    newRings.push({
      ...root,
      children,
    });
  }

  return newRings;
}

function excludeTop(node) {
  let top;
  while ((top = getMainNode(node))) {
    node = top;
  }
  return node;
}

function getMainNode(node) {
  const { children } = node;
  if (children.length === 1) {
    // If there is only one node in the ring then
    // choose it's only child to become the new root.
    return children[0];
  } else {
    // If there is only one node in the ring that
    // has at least 1% of the total size then choose
    // it as the new root.
    const sum = sumBy(children, 'total');
    const prime = [];
    for (let child of children) {
      const pct = child.total / sum;
      if (pct > 0.01) {
        prime.push(child);
      }
    }
    if (prime.length === 1) {
      return prime[0];
    }
  }
}

function getRingDepth(node, depth = 0) {
  const { children } = node;
  if (!children) {
    return depth;
  }

  let childDepth = depth;

  for (let child of children) {
    childDepth = Math.max(childDepth, getRingDepth(child, depth + 1));
  }
  return childDepth;
}

function mapChildren(node) {
  return node.children
    .toSorted((a, b) => {
      return b.total - a.total;
    })
    .map((child) => {
      return {
        ...child,
        parent: node,
      };
    });
}
