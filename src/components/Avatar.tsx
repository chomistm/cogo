import { initials } from "@/lib/format";

export function Avatar({ name, url, size = 44 }: { name?: string | null; url?: string | null; size?: number }) {
  const style = { width: size, height: size };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={style} className="rounded-full object-cover shrink-0" />;
  }
  return (
    <div style={{ ...style, fontSize: size * 0.32 }} className="rounded-full bg-navy2 text-white grid place-items-center font-display font-semibold shrink-0">
      {initials(name)}
    </div>
  );
}
