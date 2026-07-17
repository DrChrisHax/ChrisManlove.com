import { canonicalDomain } from './middleware/canonicalDomain.js';
import { markdownNegotiation } from './middleware/markdownNegotiation.js';

const middlewares = [
  canonicalDomain,
  markdownNegotiation,
];

export async function onRequest(context) {
  let index = 0;

  const dispatch = async () => {
    if (index < middlewares.length) {
      const middleware = middlewares[index++];
      return middleware(context, dispatch);
    }
    return context.next();
  };

  return dispatch();
}
