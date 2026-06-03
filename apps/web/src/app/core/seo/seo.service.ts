import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { I18nService } from '../../shared/i18n/i18n.service';

export interface SeoData {
  /** Language-agnostic app path, e.g. '/event/slug' or '/' for home. */
  path: string;
  title: string;
  description: string;
  image?: string | null;
  type?: 'website' | 'article' | 'profile';
  /** schema.org JSON-LD payload (rendered into a <script> tag). */
  jsonLd?: Record<string, unknown> | null;
}

/**
 * Per-page SEO: title, description, Open Graph, canonical, hreflang alternates
 * and JSON-LD. Runs on the server so the metadata is in the SSR HTML response.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly doc = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly i18n = inject(I18nService);
  private readonly site = environment.siteUrl.replace(/\/+$/, '');

  update(data: SeoData): void {
    const ukUrl = this.abs('', data.path);
    const enUrl = this.abs('/en', data.path);
    const canonical = this.i18n.lang() === 'en' ? enUrl : ukUrl;

    this.title.setTitle(data.title);
    this.meta.updateTag({ name: 'description', content: data.description });

    this.meta.updateTag({ property: 'og:title', content: data.title });
    this.meta.updateTag({ property: 'og:description', content: data.description });
    this.meta.updateTag({ property: 'og:type', content: data.type ?? 'website' });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ name: 'twitter:card', content: data.image ? 'summary_large_image' : 'summary' });
    if (data.image) {
      this.meta.updateTag({ property: 'og:image', content: data.image });
    } else {
      this.meta.removeTag("property='og:image'");
    }

    this.setLink('canonical', canonical);
    this.setAlternate('uk', ukUrl);
    this.setAlternate('en', enUrl);
    this.setAlternate('x-default', ukUrl);
    this.setJsonLd(data.jsonLd ?? null);
  }

  private abs(langPrefix: string, path: string): string {
    const clean = path === '/' ? '/' : path;
    return `${this.site}${langPrefix}${clean}`;
  }

  private setLink(rel: string, href: string): void {
    const head = this.doc.head;
    let el = head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]:not([hreflang])`);
    if (!el) {
      el = this.doc.createElement('link');
      el.setAttribute('rel', rel);
      head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  private setAlternate(lang: string, href: string): void {
    const head = this.doc.head;
    let el = head.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${lang}"]`);
    if (!el) {
      el = this.doc.createElement('link');
      el.setAttribute('rel', 'alternate');
      el.setAttribute('hreflang', lang);
      head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  private setJsonLd(data: Record<string, unknown> | null): void {
    const head = this.doc.head;
    const existing = head.querySelector('script[type="application/ld+json"]');
    if (!data) {
      existing?.remove();
      return;
    }
    const script = existing ?? this.doc.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(data);
    if (!existing) head.appendChild(script);
  }
}
