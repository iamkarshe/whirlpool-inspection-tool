export function BrandLogo() {
  return (
    <>
      <img
        src="/logo.svg"
        alt="Whirlpool"
        className="block dark:hidden"
      />
      <img
        src="/logo-dark.svg"
        alt="Whirlpool"
        className="hidden dark:block"
      />
    </>
  );
}
