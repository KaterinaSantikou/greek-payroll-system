// Always import THIS module wherever you need passport.
import passport from "passport";

// Hard guard: make sure no other copy is used
// @ts-ignore
if ((global as any).__passport_singleton && (global as any).__passport_singleton !== passport) {
  console.warn("Multiple passport instances detected");
}
// @ts-ignore
(global as any).__passport_singleton = passport;

export default passport;