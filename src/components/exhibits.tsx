import type { Exhibit } from "@/lib/sources/exhibits";

const LETTERS = "ABCDEFGH";

export function exhibitLabel(index: number): string {
  return `Exhibit ${LETTERS[index] ?? index + 1}`;
}

/** Author, license and file page: what Commons licenses ask for wherever an image is shown. */
export function ExhibitCredit({ exhibit, className = "" }: { exhibit: Exhibit; className?: string }) {
  return (
    <span className={className}>
      {exhibit.credit || "Wikimedia Commons"} ·{" "}
      {exhibit.licenseUrl ? (
        <a href={exhibit.licenseUrl} target="_blank" rel="noopener noreferrer license" className="underline">
          {exhibit.license}
        </a>
      ) : (
        exhibit.license
      )}{" "}
      ·{" "}
      <a href={exhibit.pageUrl} target="_blank" rel="noopener noreferrer" className="underline">
        file page
      </a>
    </span>
  );
}

/** A real archive image in a fixed 4:3 frame, so it never shifts the layout while loading. */
export function ExhibitImage({ exhibit, eager = false, className = "" }: { exhibit: Exhibit; eager?: boolean; className?: string }) {
  return (
    // Commons serves ready-sized thumbnails; next/image would only re-encode them through the image quota.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={exhibit.imageUrl}
      alt={exhibit.title}
      width={exhibit.width}
      height={exhibit.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`aspect-[4/3] h-auto w-full bg-surface-muted object-cover ${className}`}
    />
  );
}

export function ExhibitPhoto({ exhibit, label, tilt = 0 }: { exhibit: Exhibit; label: string; tilt?: number }) {
  return (
    <figure className="paper rounded-[2px] bg-white p-2 pb-3" style={{ rotate: `${tilt}deg` }}>
      <a href={exhibit.pageUrl} target="_blank" rel="noopener noreferrer" className="block" aria-label={`${exhibit.title} on Wikimedia Commons`}>
        <ExhibitImage exhibit={exhibit} />
      </a>
      <figcaption className="mt-2 text-[0.72rem] leading-snug">
        <span className="font-typewriter tracking-wider uppercase">{label}</span>
        <span className="mt-0.5 block font-semibold break-words">{exhibit.title}</span>
        <ExhibitCredit exhibit={exhibit} className="mt-0.5 block break-words text-muted" />
      </figcaption>
    </figure>
  );
}

const TILTS = [-1.2, 0.8, -0.6, 1.1];

export function ExhibitGallery({ exhibits }: { exhibits: Exhibit[] }) {
  if (exhibits.length === 0) return null;
  return (
    <section aria-labelledby="exhibits-heading" className="flex flex-col gap-3">
      <h2 id="exhibits-heading" className="font-typewriter text-xl tracking-wider uppercase">
        Exhibits
      </h2>
      <p className="text-sm text-muted">Real archive images from the case&apos;s sources on Wikimedia Commons. Tap one for its file page.</p>
      <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {exhibits.map((exhibit, index) => (
          <li key={exhibit.pageUrl}>
            <ExhibitPhoto exhibit={exhibit} label={exhibitLabel(index)} tilt={TILTS[index % TILTS.length]} />
          </li>
        ))}
      </ul>
    </section>
  );
}
