// TODO: support __FILE__ and __LINE__

/**
 * @import { Plugin } from "rolldown"
 */

/**
 * @returns {Plugin}
 */
export default function macro() {
  return {
    name: 'macro',
    transform: {
      filter: {
        id: {
          include: /\.[jt]sx?$/,
          exclude: /node_modules/,
        },
      },
      handler(code, id, meta) {
        const match = code.matchAll(/\b(__FILE__|__LINE__)\b/gm)
      },
    },
  }
}
