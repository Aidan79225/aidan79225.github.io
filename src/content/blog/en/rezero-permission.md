---
title: "Permissions: Who Can Press Which Button — We Rebuilt It Three Times"
date: 2026-07-28
category: tech
description: "Second operations chapter, and an honest failure: Django permissions too fine-grained to mean anything, then stuffed into a JWT which set the wrong granularity in concrete, then role-based only to watch roles explode — landing finally on stackable role composition. The multiply-becomes-add trick saves the day a third time, plus one clean cut on contractor access: they can see the code, never the data."
tags:
  - war-story
  - live-commerce
  - authorization
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 10
comments: true
draft: false
translationOf: rezero-permission
---
Permissions are something I'll certify as **one of the parts we didn't get right**: rebuilt three times, each costing real time, each only half right. What's interesting is that laid end to end, those three rebuilds walk the classic evolution of a permission system — so this chapter is less a confession than planting signposts for whoever comes next.

## A three-act play: every step was locally reasonable

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 240" role="img" aria-label="Three acts in the evolution of the permission system. Act one uses Django's built-in groups and permissions, at a granularity of add, change, delete and view per model — a machine's granularity, where a task has to be translated by hand into a pile of table-level permissions. Act two spent a week stuffing permissions into the JWT, which set the wrong granularity in concrete, bloating the token and requiring a re-login for permission changes. Act three moved to role-based, where the semantics were finally right, but orthogonal axes made the number of roles explode. Where it landed: adding stackable capability roles such as cost monitor, so a person equals a function role plus capability roles, and multiplication becomes addition." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rpm" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="16" y="36" width="126" height="96" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="79" y="56" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">Act I</text>
    <text x="79" y="72" fill="#e6e6e6" font-size="6.8" text-anchor="middle">Django group</text>
    <text x="79" y="84" fill="#e6e6e6" font-size="6.8" text-anchor="middle">+ permission</text>
    <text x="79" y="104" fill="#e05a7d" font-size="6.2" text-anchor="middle">model-level CRUD</text>
    <text x="79" y="116" fill="#e05a7d" font-size="6.2" text-anchor="middle">a machine's granularity</text>
    <line x1="142" y1="84" x2="158" y2="84" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rpm)"/>
    <rect x="162" y="36" width="126" height="96" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="225" y="56" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">Act II (+1 week)</text>
    <text x="225" y="72" fill="#e6e6e6" font-size="6.8" text-anchor="middle">permissions</text>
    <text x="225" y="84" fill="#e6e6e6" font-size="6.8" text-anchor="middle">stuffed into the JWT</text>
    <text x="225" y="104" fill="#e05a7d" font-size="6.2" text-anchor="middle">wrong granularity, in concrete</text>
    <text x="225" y="116" fill="#e05a7d" font-size="6.2" text-anchor="middle">a change = a re-login</text>
    <line x1="288" y1="84" x2="304" y2="84" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rpm)"/>
    <rect x="308" y="36" width="126" height="96" rx="7" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="371" y="56" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-weight="bold">Act III</text>
    <text x="371" y="72" fill="#e6e6e6" font-size="6.8" text-anchor="middle">move to role-based</text>
    <text x="371" y="84" fill="#54b890" font-size="6.4" text-anchor="middle">semantics finally right</text>
    <text x="371" y="104" fill="#e05a7d" font-size="6.2" text-anchor="middle">but an orthogonal axis appears</text>
    <text x="371" y="116" fill="#e05a7d" font-size="6.2" text-anchor="middle">and roles start exploding</text>
    <line x1="434" y1="84" x2="450" y2="84" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rpm)"/>
    <rect x="454" y="36" width="112" height="96" rx="7" fill="#233528" stroke="#54b890" stroke-width="1.5"/>
    <text x="510" y="56" fill="#54b890" font-size="7.6" text-anchor="middle" font-weight="bold">Landing</text>
    <text x="510" y="72" fill="#e6e6e6" font-size="6.8" text-anchor="middle">stackable</text>
    <text x="510" y="84" fill="#e6e6e6" font-size="6.8" text-anchor="middle">capability roles</text>
    <text x="510" y="104" fill="#54b890" font-size="6.2" text-anchor="middle">cost monitor</text>
    <text x="510" y="116" fill="#54b890" font-size="6.2" text-anchor="middle">multiply → add</text>
    <text x="290" y="176" fill="#9aa4b2" font-size="7.4" text-anchor="middle">Every step was locally reasonable: use the built-in (saves time) → stuff it in the JWT (matches statelessness) → switch to roles (needs semantics)</text>
    <text x="290" y="194" fill="#9aa4b2" font-size="7.4" text-anchor="middle">The error is in none of the steps — it's never having asked what this system's natural unit of permission is</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Three rebuilds, each half right: granularity, carrier, semantics, composition — permission's four questions, walked into one at a time.</figcaption>
</figure>

**Act I: Django's built-in groups + permissions.** Saves time, has documentation, integrates with admin — an entirely reasonable opening. But a built-in permission is model-level add/change/delete/view: it's **a machine's granularity**, describing tables. And this system's real semantics are **tasks**: "the assistant can open bidding", "support can clear a cart", "operations can close a round" — one task spans several tables, one table is touched by several tasks. Two coordinate systems that don't line up, so every authorisation becomes a human translation, and a mistranslation is a missing or an excess permission.

**Act II: stuff the permissions into the JWT, one week's work.** The motive was reasonable too — as [[rezero-stack|the opening move]] said, this system's auth is a stateless JWT, so permissions travelling with the token means every server verifies independently. Beautiful. But what got stuffed in was still that wrongly-grained permission set: a bloated token is the small problem, and the real cost is **the wrong model getting poured in concrete** — after that, every attempt to change the granularity carried an extra layer of "what do we do about the old permissions inside existing tokens?". The propagation problem was solved pragmatically: a permission change takes effect on re-login, because every subject here is an internal employee you can call and who can wait. **A permission system's latency requirement follows its subjects** — coarse is fine for insiders; only outsiders need fine.

**Act III: move to role-based, and then roles explode.** The semantics were finally right — who you are decides what you can do. But it hit another wall fast: **orthogonal axes**. The most sensitive data in this system is **cost** — what the company pays the supplier — and who may see it has nothing to do with function: some operators need it, some don't; engineers normally don't. Encode "can see cost" into the role name and the role count doubles immediately: operator, operator-who-sees-cost, assistant, assistant-who-sees-cost… and every additional axis of that kind doubles it again.

**Where it landed: a new role called cost monitor.** A role representing a single capability, stackable onto any function role. At the time I joked that "we've sort of come back to permission granularity" — now I'd give it its proper name: this is **role composition**, and it's the correct landing.

## Multiplication becomes addition — the third time this saves the day

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 226" role="img" aria-label="A comparison of exploding roles and role composition. On the left, crossed out: multiplying an orthogonal axis into the role name gives operator, operator with cost, assistant, assistant with cost, support, support with cost — three functions times one boolean axis is six roles, and every extra axis doubles it. On the right, ticked: three function roles plus one capability role such as cost monitor; a person's permissions are a function role plus zero or more capability roles stacked on top, so the total number of roles adds rather than multiplies." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="290" y1="14" x2="290" y2="200" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="145" y="28" fill="#e05a7d" font-size="9" text-anchor="middle" font-weight="bold">✗ Axes multiplied into names: M × 2ᴺ</text>
    <rect x="36" y="44" width="100" height="22" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="86" y="59" fill="#e6e6e6" font-size="6.6" text-anchor="middle">operator</text>
    <rect x="150" y="44" width="110" height="22" rx="5" fill="#3a2632" stroke="#e05a7d" stroke-width="1"/><text x="205" y="59" fill="#e05a7d" font-size="6.6" text-anchor="middle">operator + cost</text>
    <rect x="36" y="76" width="100" height="22" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="86" y="91" fill="#e6e6e6" font-size="6.6" text-anchor="middle">assistant</text>
    <rect x="150" y="76" width="110" height="22" rx="5" fill="#3a2632" stroke="#e05a7d" stroke-width="1"/><text x="205" y="91" fill="#e05a7d" font-size="6.6" text-anchor="middle">assistant + cost</text>
    <rect x="36" y="108" width="100" height="22" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="86" y="123" fill="#e6e6e6" font-size="6.6" text-anchor="middle">support</text>
    <rect x="150" y="108" width="110" height="22" rx="5" fill="#3a2632" stroke="#e05a7d" stroke-width="1"/><text x="205" y="123" fill="#e05a7d" font-size="6.6" text-anchor="middle">support + cost</text>
    <text x="145" y="158" fill="#e05a7d" font-size="7" text-anchor="middle">each orthogonal axis doubles everything</text>
    <text x="145" y="172" fill="#9aa4b2" font-size="6.6" text-anchor="middle">add "can see PII" and you have 12 roles</text>
    <text x="435" y="28" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">✓ Axes stack independently: M + N</text>
    <text x="365" y="52" fill="#9aa4b2" font-size="6.8" text-anchor="middle">function roles</text>
    <rect x="320" y="60" width="90" height="22" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="365" y="75" fill="#e6e6e6" font-size="6.6" text-anchor="middle">operator</text>
    <rect x="320" y="88" width="90" height="22" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="365" y="103" fill="#e6e6e6" font-size="6.6" text-anchor="middle">assistant</text>
    <rect x="320" y="116" width="90" height="22" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="365" y="131" fill="#e6e6e6" font-size="6.6" text-anchor="middle">support</text>
    <text x="500" y="52" fill="#9aa4b2" font-size="6.8" text-anchor="middle">capability roles (stackable)</text>
    <rect x="450" y="60" width="100" height="22" rx="11" fill="#233528" stroke="#54b890" stroke-width="1.3"/><text x="500" y="75" fill="#54b890" font-size="6.6" text-anchor="middle">cost monitor</text>
    <text x="500" y="106" fill="#9aa4b2" font-size="6.4" text-anchor="middle">(future: pii viewer …)</text>
    <text x="435" y="160" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">a person = a function role + zero or more capability roles</text>
    <text x="435" y="175" fill="#9aa4b2" font-size="6.6" text-anchor="middle">roles add up, they don't multiply</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Don't multiply orthogonal things into a name — let them exist independently and stack freely.</figcaption>
</figure>

If you've followed from the first post, this arithmetic should look familiar: converging multi-platform comments through adapters is [[rezero-comment-order|M×N→M+N]], the observability [[obs-collection|collector]] is M×N→M+N — and **so are permissions**. Multiply orthogonal things into a name and the combinations explode; let them exist independently and stack freely and the total merely adds. Incidentally, [[k8s-rbac|Kubernetes RBAC]] walks the same road: roles only stack, there is no deny — the industry converged on addition because multiplication loses on the maths alone.

## The contractor boundary: they can see the code, never the data

One cut in this chapter was made decisively: **contractors got GitHub permissions for the repo, and nothing at all on GCP — no Production, no data**. Collaboration needs code; and the commercial secrets (cost, customers, orders) all live in the data. That line is the same thinking as [[rezero-fulfillment|the shipping chapter]]'s information/physical split: **draw the boundary along the cross-section of breach cost**. Leaked code is backstopped by licences and lawyers; leaked data damages the business directly — so cut it clean, with no grey zone at all.

## What a rebuild would do

Permissions are the kind of thing that's very hard to "get right on day one" — full RBAC+ABAC on day one is over-engineering, and patching it on day N is three rebuilds. In a rebuild I wouldn't chase getting it right in one shot, I'd chase **making the rebuilds cheap**:

1. **The home of a permission check is the use case's entrance.** In Clean Architecture's language, authorisation is an **application-layer business rule** — "the assistant can open bidding" describes neither a table (so not in the entity/ORM) nor HTTP (so not in the controller), it's **who this task itself allows** — and a task's incarnation in code is a use case. So the enforcement point converges on the use case boundary: each use case declares who may call it, and at the door you ask `can(user, this_use_case, resource)`. That choice interlocks with this chapter's conclusion — the correct granularity of a permission is a task is a use case, so **a role is a set of use cases**, and the permission model and the program structure finally speak the same language. An outer middleware doing a coarse filter (logged in? has a basic role?) is fine as defence in depth, but it's only the politeness of failing fast; the front end hiding buttons is only experience — **the use case entrance is always what counts**, because it's the only thing that stops "hit the same operation through a different entrance". Two special cases: resource ownership (you may only touch your own cart) needs the entity loaded before it can be judged, so judge inside the use case after fetching; and field visibility (cost) is **decided in the use case and enforced in the presenter** — unauthorised fields get stripped before the data leaves. Half the cost of those three rebuilds went on permission checks scattered everywhere; converged on the use case boundary, swapping permissions for roles and roles for composition each touches one layer.
2. **Dual-track roles — function plus capability — from day one.** Function roles align with [[rezero-console|the five interfaces]] (as the last chapter said: how you cut interfaces *is* the permission model, since both describe "who is doing what"); sensitive capabilities (cost, personal data) are independent, stackable roles from day one — not predicting the future, but admitting the regularity that an orthogonal axis will certainly appear.
3. **Put only role names in the JWT.** A few strings, no bloat; expanding roles into permissions happens server-side, so how fast a permission change takes effect isn't hostage to the token — a re-login is only needed when the roles themselves change.
4. **Audit access to sensitive data.** Who looked at cost, and when — not distrust, but making "we fenced the most expensive thing" something you can evidence.

Let's land all four on the most common scenario — a get-product API where cost is only for cost monitors. First the shape of the response: the intuitive move is inheritance (`ProductWithCostOut(ProductOut)`), but as axes multiply so does the schema count, 2^N — **multiplying capabilities into type names is the same mistake as multiplying axes into role names**. The additive version is a **base plus stackable sections**, isomorphic to capability roles.

The permission model itself first — it's small enough to be a few types, one table and one function:

```python
from dataclasses import dataclass
from enum import StrEnum


class Role(StrEnum):
    OPERATOR = "operator"                  # function role
    ASSISTANT = "assistant"
    COST_MONITOR = "cost_monitor"          # capability role, stackable


class Capability(StrEnum):
    SEE_COST = "see_cost"                  # an output entitlement; the view knows only this


@dataclass(frozen=True)
class Principal:
    account_id: int
    roles: frozenset[Role]                 # everything decoded from the JWT — this small

    def has_role(self, role: Role) -> bool:
        return role in self.roles


class PermissionDenied(Exception):
    pass


# "a role is a set of use cases" — the sentence, grown directly into a data structure.
# The whole system's authorisation truth is this one table (lives at the composition
# root, importing every use case).
ROLE_USE_CASES: dict[Role, frozenset[type]] = {
    Role.OPERATOR:     frozenset({GetProductUseCase, EndPeriodUseCase}),
    Role.ASSISTANT:    frozenset({GetProductUseCase, StartBiddingUseCase}),
    Role.COST_MONITOR: frozenset(),        # a capability role opens no doors, it grants entitlement
}


def require(principal: Principal, use_case: type) -> None:
    if not any(use_case in ROLE_USE_CASES[r] for r in principal.roles):
        raise PermissionDenied(f"{principal.account_id} cannot {use_case.__name__}")
```

Notice there's **no AuthorizationService** here — a permission check doesn't need a service: the role list sits on `Principal` (the entity's own data), the role-to-use-case mapping is a constant table, and `require` is a pure function. The urge to wrap it in a service mostly comes from the era when permission checks were scattered everywhere; converged on the use case boundary, it's too small to deserve a class.

The use case itself depends on two ports, injected with injector (which was also the codebase's real dialect back then):

```python
from typing import Protocol

from injector import inject


class ProductRepository(Protocol):         # port: the use case depends on an interface
    def get(self, product_id: int) -> Product: ...


class AuditLog(Protocol):
    def viewed_cost(self, principal: Principal, product_id: int) -> None: ...


@dataclass(frozen=True)
class GetProductResult:
    product: Product
    capabilities: frozenset[Capability]


class GetProductUseCase:
    @inject
    def __init__(self, products: ProductRepository, audit: AuditLog) -> None:
        self._products = products
        self._audit = audit

    def execute(self, principal: Principal, product_id: int) -> GetProductResult:
        require(principal, type(self))                      # enforcement point: check at the door

        product = self._products.get(product_id)

        caps: set[Capability] = set()
        if principal.has_role(Role.COST_MONITOR):           # role → entitlement, translated only here
            caps.add(Capability.SEE_COST)
            self._audit.viewed_cost(principal, product_id)  # sensitive access leaves a trace (rule 4)

        return GetProductResult(product=product, capabilities=frozenset(caps))
```

And the view — it's the presenter, and it only picks the exits:

```python
from django.http import HttpRequest
from ninja import Router, Schema


class CostSection(Schema):
    cost: int
    margin: float


class ProductOut(Schema):
    id: int
    name: str
    price: int
    cost_info: CostSection | None = None   # a capability section: one capability, one block


router = Router()


@router.get("/products/{product_id}", response=ProductOut, exclude_none=True)
def get_product(request: HttpRequest, product_id: int) -> ProductOut:
    use_case = request.injector.get(GetProductUseCase)   # bound by django-injector
    result = use_case.execute(request.auth, product_id)

    out = ProductOut.from_orm(result.product)
    if Capability.SEE_COST in result.capabilities:       # no permission reasoning, just pick the exit
        out.cost_info = CostSection.from_orm(result.product)
    return out
```

A few details are deliberate:

- **The truth of authorisation is one table.** `ROLE_USE_CASES` is the single fact of the whole system's permissions: reviewing permissions means reviewing one table, a new joiner asking "what can operations do?" reads one line, and generating permission documentation means iterating a dict. In the era of three rebuilds, answering those questions meant grepping the whole codebase.
- **Sections are additive.** One more sensitive axis (personal data, margin) is one more `xxx_info: Section | None` — schema counts add rather than multiply. Capability roles stack, response sections stack; the same arithmetic reaches all the way out to the shape of the API.
- **`exclude_none=True` means an unauthorised section doesn't even appear as a key.** `"cost_info": null` is a leak too — it tells the caller the field exists.
- **The view knows no roles at all.** What it receives is an entitlement translated by the use case (`SEE_COST`); rename, split, merge or replace the role model and the view doesn't move a line. `StrEnum` gives those identifiers types and completion, so a typo blows up in tests instead of surviving to production as a comparison that's permanently false.
- **The repo goes through injector.** The use case depends on the `ProductRepository` interface — a unit test of the permission check swaps in a fake repo and runs without touching a database; and a use case class having exactly one public `execute` is what stops it sliding into a service junk drawer.

Finally, there's a more thorough version: **make the sensitive field its own sub-resource** — `GET /products/{id}/cost`, with permissions attached to the resource, no schema games at all, audit naturally separated and public data safely cacheable. But be careful about the test for it: **it is not "cost belongs to another domain"** — cost as a fact is born in purchasing, but a host absolutely has to know it to quote a price; it's a necessity at the point of sale, and forcing it into the purchasing domain is a paper taxonomy that contradicts business reality. The real test for a sub-resource is **the access boundary**: for the same data, when who reads it, how often, and how sensitive it is differ enough from the parent, it deserves its own door — one door, one permission, one audit trail, one caching policy. A section is the additive answer when the field must be embedded; a sub-resource is the thorough answer when the access boundary is clear enough.

## Reflections

### Friction debt has no collections department

Overselling explodes, payments explode — their debt carries interest and a collections department, and failing to pay causes an incident. Getting permissions wrong doesn't explode, it merely **rubs**: five extra minutes per authorisation, one extra round of questions per new joiner, one extra detour per requirement. No alert, no incident report, and never a place in a sprint — until one day somebody snaps and everyone discovers they'd all been quietly suffering for a long time. The test I use now: **when an internal process everybody complains about never gets scheduled for a fix, that's friction debt** — it won't surface by itself, so someone has to go fishing for it on a schedule.

### The standard for granularity isn't security, it's semantics

All three rebuilds circled the same question: how big should a **unit** of permission be. Too fine (model level) has no semantics and authorisation becomes translation; too coarse (a single `is_admin`) has no boundary and authorisation becomes a gamble. There's only one standard for the right granularity: **the unit the people using it speak in**. Operations says "she needs to be able to close a round"; the boss says "he can't see cost" — roles and capabilities are the nouns of those sentences. Testing whether a permission model is any good is simple: say an authorisation requirement out loud in plain language and see whether the system can translate it one-to-one — if the translation needs a footnote, the model is wrong.

### We didn't get it right, but nothing went wrong — why

Having been honest about the detours, it's fair to answer one more question: with a permission system rebuilt three times, why did nothing ever go wrong? Because **the most expensive thing was fenced from day one** — cost visibility had dedicated control, contractors couldn't touch data, and every subject was an internal employee. How elegant your permission model is affects friction; **whether your assets are fenced is what affects survival**. The ordering lesson for me: fence the most expensive data in the dumbest possible way first, then improve the model's elegance at leisure — teams that do it the other way around have a beautiful model, and then hand the entire cost table over during one contractor handover.
