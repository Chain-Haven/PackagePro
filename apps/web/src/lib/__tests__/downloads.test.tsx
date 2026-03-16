import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement('a', { href, ...props }, children),
}));

describe('download copy', () => {
  it('describes Windows downloads as zip artifacts on the dedicated download page', async () => {
    const { default: DownloadPage } = await import('@/app/download/page');
    const markup = renderToStaticMarkup(React.createElement(DownloadPage));

    expect(markup).toContain('Download .zip');
    expect(markup).not.toContain('Download .exe');
    expect(markup).not.toContain('NSIS installer');
  });

  it('describes Windows downloads as zip artifacts on the landing page', async () => {
    const { default: LandingPage } = await import('@/app/page');
    const markup = renderToStaticMarkup(React.createElement(LandingPage));

    expect(markup).toContain('Windows ZIP package');
    expect(markup).not.toContain('Download .exe');
    expect(markup).not.toContain('NSIS installer');
  });
});
