---
title: "Easy to Upload, Hard to Delete: The Life Cycle of Images and Resources"
date: 2026-08-01
category: tech
description: "Product images start as a screenshot of the live stream pasted into a dialog: the front end cropping and converting to webp is an optimisation, the back end always re-encoding is a guarantee — transcoding as validation; image_metadata's bidirectional references, a daily sweep, an insurance policy never claimed on; and the bug generator I wrote with my own hands, SoftDeleteModel — uploading takes an afternoon, deleting takes a lifetime."
tags:
  - war-story
  - live-commerce
  - system-design
series: "Re:Building a Live-Commerce Platform from Zero"
seriesOrder: 17
comments: true
draft: false
translationOf: rezero-asset-lifecycle
---
A detour into the least glamorous topic here: **product images**. "Isn't that just file upload?" — this chapter spends half its length on uploading and the other half on something far harder: **deleting**. Uploading takes an afternoon; deleting takes a lifetime.

## Birth: an upload pipeline designed for the live floor

Look at this pipeline's real usage context first, because the whole design grew from it. [[rezero-console|#9]] said the person operating the platform during a stream is the assistant — the same person also driving the stream's settings. Where do product images come from? **Screenshot the stream, paste into a dialog on our front end, confirm, upload.** The host holds the goods up on camera, the assistant grabs the frame, Ctrl+V, and there's the product image — **the source of product images is the stream itself**.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="The image upload pipeline. On the live floor: the assistant screenshots the stream and pastes it into a dialog. On the front end: crop to a square and convert to webp, marked as optimisation, for experience and bandwidth. On the back end: always re-encode, even a webp arriving is re-encoded, and a thumbnail is produced — marked as guarantee, with the original bytes never landing, so transcoding is validation. Finally two files, the image and its thumbnail, are stored in GCS and an image_metadata row is written to the database. At the bottom: the database stores the path as fact, the API resolves it into a URL as derivation, and images are actually served from GCS behind a CDN." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="24" y="40" width="120" height="64" rx="6" fill="#1f2330" stroke="#e05a7d" stroke-width="1.2"/>
    <text x="84" y="60" fill="#e05a7d" font-size="7" text-anchor="middle" font-weight="bold">the live floor</text>
    <text x="84" y="76" fill="#e6e6e6" font-size="6.4" text-anchor="middle">assistant screenshots the stream</text>
    <text x="84" y="90" fill="#9aa4b2" font-size="6.4" text-anchor="middle">pastes into a dialog, confirms</text>
    <line x1="144" y1="72" x2="166" y2="72" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 162 68 L 168 72 L 162 76 Z" fill="#9aa4b2"/>
    <rect x="168" y="40" width="120" height="64" rx="6" fill="#233528" stroke="#54b890" stroke-width="1.2"/>
    <text x="228" y="60" fill="#54b890" font-size="7" text-anchor="middle" font-weight="bold">front end: optimisation</text>
    <text x="228" y="76" fill="#e6e6e6" font-size="6.4" text-anchor="middle">crop square · convert to webp</text>
    <text x="228" y="90" fill="#9aa4b2" font-size="6.4" text-anchor="middle">for experience and bandwidth</text>
    <line x1="288" y1="72" x2="310" y2="72" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 306 68 L 312 72 L 306 76 Z" fill="#9aa4b2"/>
    <rect x="312" y="40" width="130" height="64" rx="6" fill="#1f2330" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="377" y="60" fill="#4f6df5" font-size="7" text-anchor="middle" font-weight="bold">back end: guarantee</text>
    <text x="377" y="76" fill="#e6e6e6" font-size="6.4" text-anchor="middle">always re-encode + thumbnail</text>
    <text x="377" y="90" fill="#9aa4b2" font-size="6.4" text-anchor="middle">original bytes never land</text>
    <line x1="442" y1="72" x2="464" y2="72" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 460 68 L 466 72 L 460 76 Z" fill="#9aa4b2"/>
    <rect x="466" y="40" width="90" height="64" rx="6" fill="#1f2330" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="511" y="60" fill="#d6a45c" font-size="7" text-anchor="middle" font-weight="bold">GCS</text>
    <text x="511" y="76" fill="#e6e6e6" font-size="6.4" text-anchor="middle">image + thumbnail</text>
    <text x="511" y="90" fill="#9aa4b2" font-size="6.4" text-anchor="middle">two files</text>
    <text x="377" y="122" fill="#4f6df5" font-size="6.8" text-anchor="middle" font-weight="bold">transcoding is validation: a file that won't decode fails by itself</text>
    <rect x="168" y="140" width="274" height="30" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/>
    <text x="305" y="159" fill="#e6e6e6" font-size="6.8" text-anchor="middle">image_metadata: path · content type · object id</text>
    <line x1="377" y1="104" x2="377" y2="140" stroke="#3a4154" stroke-width="1" stroke-dasharray="3 3"/>
    <text x="290" y="196" fill="#9aa4b2" font-size="6.8" text-anchor="middle">The DB stores the path (fact); the API resolves a URL (derivation) — images are served from GCS behind a CDN</text>
    <text x="290" y="216" fill="#9aa4b2" font-size="6.8" text-anchor="middle">What the front end does is optimisation; what the back end does is guarantee</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The whole pipeline is tailored to "on the live floor, pasted from a clipboard": screenshots come in any aspect ratio so crop to square, bandwidth on set is precious so convert to webp first, and pasted content can't be trusted so always re-encode.</figcaption>
</figure>

Both ends doing webp processing looks like duplicated work, and is in fact two completely different things:

**The front end cropping to a square and converting to webp is optimisation** — screenshots come in every aspect ratio and squares lay out cleanly; bandwidth on set is precious, so one webp pass makes the upload fast and the experience good. But everything the front end does can be bypassed, which is why —

**The back end doesn't trust the front end and always re-encodes, which is a guarantee.** Before writing this chapter I went back to the code: **even an incoming webp is re-encoded**, and the originally uploaded bytes never land. That design is deeper than it looks: file validation is a ladder — check the extension, check the declared Content-Type, check the magic number, actually decode, re-encode — each rung stronger than the last, and **re-encoding is the strongest**: a file that won't decode fails on its own; anything that survives decode+encode is necessarily a real image; and any payload hidden inside the file or EXIF riding along is destroyed by the re-encode.

We never wrote a single "check whether this file is safe" if. Validation isn't a gate before the normal flow, **it's a by-product of it** — the same philosophy as [[rezero-comment-order|#3]]'s "the lookup is the validation" (a parsed key not found in the DB is naturally discarded): **transcoding is validation**.

One last small, pretty detail: the DB stores a **path (the fact)**, and the API resolves it into a full **URL (the derivation)** at response time — with images actually served from GCS behind a CDN. Change CDN or bucket one day and you change one line of resolution logic, with zero migrations. [[rezero-flash-crowd|#14]] said product images were carried by the CDN, so what the DB had to bear at peak was only the list API — the image-serving path never went through our machines at all.

## Life: one table, and an insurance policy never claimed on

The image is stored; who remembers it? **`image_metadata`**: the GCS path plus content type + object id — the [[rezero-cart-order|generic foreign key]]'s **fourth appearance** in this system (after cart sources, [[rezero-risk|blocklists]] and comment provenance). Meanwhile product and style also store the image_metadata id directly.

Note that this is a **bidirectional reference**, and the two directions exist for completely different reasons: the **forward** one (product → image) serves reads and is used every time product data goes out; the **reverse** one (image → owner) exists for exactly one thing — **cleanup**. GCS is outside the database's jurisdiction and a foreign key constraint can't protect it; this table is effectively **extending FK discipline by hand onto blob storage** — [[rezero-reconciliation|the unbundled database]] restoring another piece: Postgres manages TOAST and vacuum for itself, and since our "large objects" live in GCS, we have to keep their books and reclaim them ourselves.

Was the reverse reference ever actually used? Honesty time: **no.** The query "look up from image_metadata whether any product or style still uses this" was never written. It's an **insurance policy never claimed on** — the reason for taking it out was entirely genuine, and the day of the claim never came.

## Death (1): the daily sweep

So how did cleanup run? The real mechanism is simpler than I remembered, and more interesting:

1. When an assistant **replaces an image**, the system **marks the old image_metadata for deletion**.
2. **A daily scheduled sweep**: for everything marked, **actually delete the GCS object and clear the metadata**.

In garbage-collection language: this isn't a tracing GC scanning globally for live references, it's **a tombstone mechanism that knows at the moment of change who died** — the instant an image is replaced, the old one's death is a settled fact, so mark it; the daily sweep only executes, it never judges. The judgment (checking back whether anyone still uses it) should in theory exist, and in practice was skipped — and **nothing ever went wrong**.

Why not? Because **there was exactly one entrance to deletion**: replacing an image. The only place that marks anything for deletion is the place that definitively knows the old image has been superseded, so the mark is always right and the reverse lookup is redundant. [[rezero-reconciliation|The last chapter]]'s sentence pattern shows up again — "not built, because the structure made it unnecessary" — but this time I have to add a but: **this is the lucky version.** Last chapter's "unnecessary" was designed (redundancy deliberately squeezed out); here it merely happens to hold — the day a second deletion entrance appears (a bulk import, a product duplication, a back-office cleanup tool), a sweep with no reverse lookup starts killing innocents. The rebuild's one-line conclusion: **check back once before sweeping** — one cheap query, upgrading luck into a guarantee.

## Death (2): the bug generator I wrote with my own hands

That's death for a resource; now death for data — **soft deletion**. This part is my honest failure, and it originated with me.

I defined a `SoftDeleteModel`: add an `is_deleted` column with a custom manager — two methods, `actived` and `deleted`, with the **default queryset returning only actived** and the original `objects` renamed to `all_objects`. And then **every model inherited it**. It was comfortable: every query automatically filtered out deleted rows. Clean.

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 270" role="img" aria-label="The five-step collapse chain of SoftDeleteModel. Step one: define SoftDeleteModel with an is_deleted column and a default queryset returning only actived, objects renamed to all_objects, and every model inheriting it. Step two: one day a deleted_at column is wanted, but changing the base model touches every model. Step three: some models drop the inheritance, and implicit and explicit filtering start being mixed. Step four: every call site has to work out which camp a model belongs to, the mental load is too heavy, and engineers simply use all_objects everywhere. Step five: bugs from forgetting to filter is_deleted start appearing, and the bug generator is born. At the bottom: the root cause is that objects lied — it was no longer all." style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <rect x="40" y="20" width="500" height="34" rx="6" fill="#1f2330" stroke="#4f6df5" stroke-width="1.2"/>
    <text x="290" y="34" fill="#e6e6e6" font-size="6.8" text-anchor="middle">define SoftDeleteModel: is_deleted + a default queryset returning only actived, objects → all_objects</text>
    <text x="290" y="48" fill="#4f6df5" font-size="6.6" text-anchor="middle">every model inherits it — and it feels clean to use</text>
    <line x1="290" y1="54" x2="290" y2="68" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 286 64 L 290 70 L 294 64 Z" fill="#9aa4b2"/>
    <rect x="40" y="70" width="500" height="30" rx="6" fill="#1f2330" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="290" y="89" fill="#e6e6e6" font-size="6.8" text-anchor="middle">one day we want deleted_at — but changing the base model touches every model</text>
    <line x1="290" y1="100" x2="290" y2="114" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 286 110 L 290 116 L 294 110 Z" fill="#9aa4b2"/>
    <rect x="40" y="116" width="500" height="30" rx="6" fill="#1f2330" stroke="#e0733a" stroke-width="1.2"/>
    <text x="290" y="135" fill="#e6e6e6" font-size="6.8" text-anchor="middle">some models drop the inheritance → implicit and explicit filtering get mixed</text>
    <line x1="290" y1="146" x2="290" y2="160" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 286 156 L 290 162 L 294 156 Z" fill="#9aa4b2"/>
    <rect x="40" y="162" width="500" height="30" rx="6" fill="#3a2632" stroke="#e05a7d" stroke-width="1.2"/>
    <text x="290" y="181" fill="#e6e6e6" font-size="6.8" text-anchor="middle">every call site must work out which camp this model is in → just use all_objects everywhere</text>
    <line x1="290" y1="192" x2="290" y2="206" stroke="#9aa4b2" stroke-width="1.2"/>
    <path d="M 286 202 L 290 208 L 294 202 Z" fill="#9aa4b2"/>
    <rect x="40" y="208" width="500" height="30" rx="6" fill="#3a2632" stroke="#e05a7d" stroke-width="1.6"/>
    <text x="290" y="227" fill="#e05a7d" font-size="7" text-anchor="middle" font-weight="bold">bugs from forgetting to filter is_deleted appear — the bug generator is born</text>
    <text x="290" y="258" fill="#9aa4b2" font-size="7" text-anchor="middle">There's only one root cause: objects lied — it was no longer "all"</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">The collapse didn't start with a bug, it started with wanting to add a column and being unable to move the base model — magic's bill arrives the day you start mixing.</figcaption>
</figure>

The collapse chain is in the diagram. One day we wanted to record `deleted_at`, but changing the base model would touch every model — so some models dropped the inheritance, and **implicit and explicit filtering started being mixed**. From then on every call site had to think first: "which camp is this model in? Do I need `all_objects`? Do I filter myself?" The mental load grew day by day, and an engineer's rational choice is to converge on the one answer that needs no thought: **use `all_objects` everywhere** — safe, never loses rows. And then the queries that forget to filter `is_deleted` started appearing. **A bug generator** is my epitaph for it.

The root cause isn't at any step of the collapse chain, it's on day one: **`objects` lied**. Its name promises "all objects" and its behaviour is "objects that aren't deleted" — every call site that believed that lie is a buried mine, and mixing merely attached the fuses. A half-built abstraction is more expensive than none: fully implicit or fully explicit can both live; **mixing makes every call site pay for one more judgment**, and faced with repeated judgment a human will find a shortcut, and the shortcut will pick the wrong side. [[rezero-permission|#10]]'s three-act permission play is the same structure — a framework's magic half-used hurts more than not using it.

## The rebuild: give every kind of death a proper name

Three rules for a rebuild, all variations on "explicit":

**One: store a fact in the column, not a flag.** `deleted_at` (a nullable timestamp), not `is_deleted`. "Is it deleted?" is derived from `deleted_at IS NOT NULL`; "when was it deleted?" has an answer from day one — and the collapse that started with being unable to add `deleted_at` never happens. Append facts, derive status; [[rezero-payment|this series' iron law]] applies even to a deletion column.

**Two: share a QuerySet, not a base model; and `objects` never lies.**

```python
class SoftDeleteQuerySet(models.QuerySet):
    def active(self) -> "SoftDeleteQuerySet":
        return self.filter(deleted_at__isnull=True)

    def deleted(self) -> "SoftDeleteQuerySet":
        return self.filter(deleted_at__isnull=False)


class Product(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True)  # declared explicitly on each model
    objects = SoftDeleteQuerySet.as_manager()                 # objects doesn't lie: the default is everything

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["keyword"],
                condition=Q(deleted_at__isnull=True),   # a soft-deleted row doesn't squat on the unique key
                name="uniq_active_keyword",
            ),
        ]
```

One rule remains: `objects` is always everything, and filtering means writing `.active()` — explicit at every call site, greppable, no judgment required. **Inheritance shares policy; composition shares mechanism**: everyone shares the mechanism (QuerySet methods) while each model declares its own facts (columns), so when somebody later wants `deleted_by` they add it themselves without touching anyone else. The conditional unique constraint alongside is a vaccine against a hidden pothole: without it, a soft-deleted keyword squats on the unique key forever and a product of the same name can never be created again.

**Three: soft deletion is a per-table policy, not a global default.** The decision that "every model inherits it" went wrong earlier than how the manager was written. This system's data naturally falls into three classes, each with its own proper death:

| The data's role | How it dies | Examples |
|---|---|---|
| **Facts** | Never deleted — "deletion" doesn't exist | order, orders payment, allocation log |
| **Master data referenced by facts** | Soft delete — hard deletion breaks history | product, style, image_metadata |
| **Transient** | Hard delete — cleared without apology | cart items |

The interesting part is that the behaviour back then already followed that table: [[rezero-cart-order|closing a round]] hard-deleted carts without apology, and nobody ever dared delete an order — it's just that the base model flattened all three classes into one. The tables genuinely needing soft deletion number five or six; declaring them explicitly isn't tiring at all.

## Reflections

**Uploading is a feature; deleting is a responsibility.** Upload code is written in an afternoon, demos perfectly and ships to applause; but from the moment upload is pressed, every byte starts being billed, every reference can break, and every image eventually faces the day of "does anyone still want you?". Few people think deletion through while building upload — we managed half: the table existed, the reverse lookup didn't. A resource's life cycle doesn't end at "upload succeeded", **it begins there**.

**The best validation is no validation gate.** Transcoding as validation, the lookup as validation — this system's two toughest defences weren't written as ifs, they came from designing the unavoidable flow into a natural filter. A gate can be bypassed, forgotten, or drift away from the main flow; a by-product can't, because it *is* the main flow.

**Implicit is borrowed convenience.** The comfort of `objects` automatically filtering deleted rows is borrowed from the future — interest starts accruing the day you begin mixing, is paid in instalments by the judgment cost at every call site, and settles in one lump sum as a bug. Typing seven more characters (`.active()`) buys out never having to judge again. What's that lesson worth? An epitaph reading "bug generator", and a chapter's length.

Peaks, operations, reconciliation, life cycles — the battles that cut across the system end here. Next, the people who built all of it: **six engineers, and how they ran at the speed of twenty**.
