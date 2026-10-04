# GitHub Agents

هاد النظام كيربط الوكلاء المحليين بمستودع GitHub عبر `gh` CLI.

## الإعداد

عدّل [github.json](./github.json):

- `repository`: المستودع بصيغة `owner/name`.
- `defaultBranch`: الفرع الأساسي.
- `projectNumber`: رقم GitHub Project، أو `null` لتعطيل الربط التلقائي.
- `defaultCommand`: أمر الفحص الافتراضي.
- `publishByDefault`: يبقى `false` حفاظاً على الأمان؛ النشر يحتاج `--publish`.

خاص يكون `gh auth status` ناجحاً قبل الاستعمال.

## دورة العمل

1. أنشئ Issue وأضف label: `agent:ready`.
2. شغّل المزامنة:

```bash
pnpm agent github sync
```

3. شغّل أول Issue جاهزة:

```bash
pnpm agent github run
```

أو Issue معينة:

```bash
pnpm agent github run 123
```

الوكيل كيدير الآتي:

- يقرأ Issue ويدخلها إلى `tasks/state.yml`.
- يضيفها إلى GitHub Project إذا كان `projectNumber` مضبوطاً.
- ينشئ branch باسم `agent/issue-123`.
- يبدّل labels إلى `agent:in-progress`.
- يشغّل command، ثم التشخيص والمصلح التلقائي حتى 3 محاولات.
- عند النجاح يعمل commit محلياً ويضع `agent:done`.
- عند الفشل يضع `agent:blocked` ويكتب التشخيص كتعليق.

## فتح Pull Request

افتراضياً النظام ما كيرفعش branch وما كيفتحش PR. من بعد مراجعة التغييرات، شغّل:

```bash
pnpm agent github run 123 --publish
```

هاد الأمر كيرفع branch ويفتح PR ويربطه بالـ Issue عبر `Closes #123`.

## تحديد الأوامر داخل Issue

يمكن تغيير الأوامر الافتراضية داخل body ديال Issue باستعمال:

```md
<!-- agent:
command: pnpm check && pnpm test
fixCommand: pnpm install
-->
```

`fixCommand` كيتشغّل بعد التشخيص، وكيستقبل:

- `AGENT_TASK_ID`
- `AGENT_DIAGNOSIS`
- `AGENT_LOG_PATH`

## Project

أنشئ labels المطلوبة مرة واحدة فالمستودع:

- `agent:ready`
- `agent:in-progress`
- `agent:blocked`
- `agent:done`

ثم ضع رقم الـ Project في `tasks/github.json`. المزامنة غادي تستعمل `gh project item-add` لإضافة كل Issue مرتبطة بالوكيل.
