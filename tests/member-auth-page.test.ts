import assert from "node:assert/strict";
import test from "node:test";
import { memberAuthPageInput, memberAuthSwitchHref, PUBLIC_MEMBER_RETURN_TO } from "../lib/member-auth-page";

test("public auth returns to the real member view while legacy raffle login retains its destination", () => {
  assert.equal(memberAuthPageInput({}).returnTo, PUBLIC_MEMBER_RETURN_TO);
  assert.equal(memberAuthPageInput({}, "/adventure/raffles").returnTo, "/adventure/raffles");
  assert.equal(memberAuthPageInput({ returnTo: ["/adventure/skills", "https://evil.test/"] }).returnTo, PUBLIC_MEMBER_RETURN_TO);
});

test("login and registration switches preserve an allowed auction deep link without double decoding", () => {
  const destination = "/adventure/marketplace?guildId=123456789012345678&view=auctions&compose=auction#offers";
  const input = memberAuthPageInput({ returnTo: destination });
  for (const mode of ["login", "register"] as const) {
    const link = new URL(memberAuthSwitchHref(mode, input.returnTo), "https://community.test");
    assert.equal(link.pathname, `/${mode}`);
    assert.equal(link.searchParams.get("returnTo"), destination);
    assert.equal(memberAuthPageInput({ returnTo: link.searchParams.get("returnTo")! }).returnTo, destination);
  }
});

test("auth UI never turns an untrusted return destination into an external or Office link", () => {
  for (const returnTo of ["https://evil.test/adventure", "//evil.test/adventure", "javascript:alert(1)", "/api/auth/signin", "/members", "/adventure/skills/private", "https://user:password@member.invalid/adventure"]) {
    const input = memberAuthPageInput({ returnTo });
    assert.equal(input.returnTo, "/adventure", returnTo);
    const switchUrl = new URL(memberAuthSwitchHref("register", returnTo), "https://community.test");
    assert.equal(switchUrl.origin, "https://community.test");
    assert.equal(switchUrl.searchParams.get("returnTo"), "/adventure");
  }
});

test("OAuth errors are mapped to safe messages without reflecting provider input", () => {
  assert.match(memberAuthPageInput({ error: "MemberLinkRequired" }).error!, /ผู้ดูแล/);
  assert.match(memberAuthPageInput({ error: "MemberUnavailable" }).error!, /ไม่พร้อม/);
  const attackerText = "<script>alert('private token')</script>";
  assert.ok(memberAuthPageInput({ error: attackerText }).error);
  assert.ok(!memberAuthPageInput({ error: attackerText }).error!.includes(attackerText));
  assert.equal(memberAuthPageInput({ error: ["MemberLinkRequired", attackerText] }).error, null);
});
