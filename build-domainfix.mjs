const originalFetch = globalThis.fetch;

globalThis.fetch = (input, init) => {
  if (typeof input === 'string') {
    input = input.replace('https://vet-practice-rho.vercel.app', 'https://vetaltas.vercel.app');
  } else if (input instanceof URL) {
    input = new URL(input.toString().replace('https://vet-practice-rho.vercel.app', 'https://vetaltas.vercel.app'));
  } else if (input?.url?.startsWith('https://vet-practice-rho.vercel.app')) {
    input = new Request(input.url.replace('https://vet-practice-rho.vercel.app', 'https://vetaltas.vercel.app'), input);
  }
  return originalFetch(input, init);
};

await import('./build-branding.mjs');
