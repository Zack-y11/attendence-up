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
  place?: PagePlace | null;
};

const JSON_LD_ID = 'attendence-up-jsonld';

export function setPageMeta({ title, description, index, place }: PageMeta) {
  document.title = title;
  upsertMeta('name', 'description', description);
  upsertMeta('name', 'robots', index ? 'index, follow' : 'noindex, nofollow');
  upsertMeta('property', 'og:title', title);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:type', place ? 'place' : 'website');
  upsertMeta('property', 'og:url', window.location.href);
  upsertMeta('property', 'og:locale', document.documentElement.lang === 'es' ? 'es_SV' : 'en_US');
  upsertMeta('property', 'og:locale:alternate', document.documentElement.lang === 'es' ? 'en_US' : 'es_SV');
  upsertMeta('name', 'twitter:card', 'summary');
  upsertMeta('name', 'twitter:title', title);
  upsertMeta('name', 'twitter:description', description);
  upsertLink('canonical', `${window.location.origin}${window.location.pathname}`);
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
