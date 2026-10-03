export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-neutral-200 py-8">
      <div className="container-page flex flex-col gap-2 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <p>Stock is reserved at checkout and released automatically if payment does not complete.</p>
        <p>Payment state is set only by signature-verified gateway webhooks.</p>
      </div>
    </footer>
  );
}
