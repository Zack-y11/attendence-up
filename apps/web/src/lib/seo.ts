type PagePlace = {
  name: string;
  latitude: number;
  longitude: number;
};

type PageMeta = {
  title: string;
  description: string;
  /** Private routes and check-in tokens stay out of search results. */
  index: boolean;
  language: 'en' | 'es';
  place?: PagePlace | null;
};

const JSON_LD_ID = 'attendence-up-jsonld';

export function setPageMeta({ title, description, index, language, place }: PageMeta) {
  document.title = title;
  const spanish = language === 'es';
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', index ? 'index, follow, max-snippet:-1, max-image-preview:large' : 'noindex, nofollow');
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:type', place ? 'place' : 'website');
  upsertMeta('property', 'og:url', canonicalHref(spanish));
  upsertMeta('property', 'og:locale', spanish ? 'es_SV' : 'en_US');
  upsertMeta('property', 'og:locale:alternate', spanish ? 'en_US' : 'es_SV');
  upsertMeta('name', 'twitter:card', 'summary');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertLink('canonical', canonicalHref(spanish));
  upsertAlternate('alternate-en', 'en', languageHref(false));
  upsertAlternate('alternate-es', 'es', languageHref(true));
  upsertAlternate('alternate-default', 'x-default', languageHref(false));
  if (place) {
    upsertMeta('name', 'geo.position', `${place.latitude};${place.longitude}`);
    upsertMeta('name', 'ICBM', `${place.latitude}, ${place.longitude}`);
  } else {
    removeMeta('name', 'geo.position');
    removeMeta('name', 'ICBM');
  }
  upsertJsonLd(title, description, place ?? null);
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function removeMeta(attr: 'name' | 'property', key: string) {
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

function pageUrl(spanish: boolean) {
  const url = new URL(window.location.href);
  url.hash = '';
  if (spanish) url.searchParams.set('lng', 'es');
  else url.searchParams.delete('lng');
  return url;
}

function canonicalHref(spanish: boolean) {
  return pageUrl(spanish).toString();
}

function languageHref(spanish: boolean) {
  return pageUrl(spanish).toString();
}

function upsertAlternate(id: string, hreflang: string, href: string) {
  let element = document.getElementById(id);
  if (!element) {
    element = document.createElement('link');
    element.id = id;
    element.setAttribute('rel', 'alternate');
    document.head.appendChild(element);
  }
  element.setAttribute('hreflang', hreflang);
  element.setAttribute('href', href);
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

function upsertJsonLd(title: string, description: string, place: PagePlace | null) {
  let element = document.getElementById(JSON_LD_ID);
  if (!element) {
    element = document.createElement('script');
    element.id = JSON_LD_ID;
    element.setAttribute('type', 'application/ld+json');
    document.head.appendChild(element);
  }
  const pageUrl = `${window.location.origin}${window.location.pathname}`;
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'WebSite',
      name: 'Attendence-Up',
      alternateName: 'Attendence Up',
      url: window.location.origin,
      description,
      inLanguage: ['en', 'es'],
    },
  ];
  if (place) {
    graph.push({
      '@type': 'Event',
      name: title,
      description,
      eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      url: pageUrl,
      location: {
        '@type': 'Place',
        name: place.name,
        geo: {
          '@type': 'GeoCoordinates',
          latitude: place.latitude,
          longitude: place.longitude,
        },
      },
    });
  }
  element.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph,
  });
}
