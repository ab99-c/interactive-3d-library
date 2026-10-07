# الوكيل المحلي لـ Windows

هاد الوكيل كيبقى خدام فحاسوبك ويراقب GitHub Issues المعلمة بـ `agent:ready`.

## المتطلبات

ثبّت:

- Node.js 22
- pnpm 9
- Git
- GitHub CLI (`gh`)

ثم سجّل الدخول:

```powershell
gh auth login
gh auth status
```

خاص `gh` يكون عنده صلاحية قراءة Issues وكتابة labels وbranches وPRs.

## إعداد مفتاح النموذج

في PowerShell:

```powershell
$env:OPENAI_API_KEY = "ضع-المفتاح-هنا"
$env:AGENT_MODEL = "gpt-4o-mini"
$env:AGENT_POLL_MS = "60000"
```

المفتاح ما يتحطش فـ repository أو Issue.

## التشغيل الآمن أولاً

الوضع الافتراضي كيحلل Issue ويكتب الخطة فالتعليق، ولكن ما كيطبقش patch:

```powershell
pnpm install
pnpm agent:local -- --once
```

أو:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-github-agent.ps1 -Once
```

راجع التشخيص قبل تفعيل التطبيق التلقائي.

## التشغيل التلقائي

```powershell
$env:AGENT_AUTO_APPROVE = "true"
powershell -ExecutionPolicy Bypass -File .\scripts\start-github-agent.ps1
```

أو:

```powershell
.\scripts\start-github-agent.ps1 -AutoApprove
```

لإيقافه استعمل `Ctrl+C`.

## دورة الوكيل

1. يقرأ Issue بـ `agent:ready`.
2. ينشئ worktree معزول وbranch `agent/issue-N`.
3. يرسل وصف المهمة وملفات المشروع للنموذج.
4. النموذج يرجع تشخيصاً وunified diff.
5. الوكيل يرفض patches التي تلمس `.github` أو الأسرار.
6. يطبق patch في worktree فقط.
7. يشغل `tests` أو أمر المشروع.
8. عند النجاح يدير commit وpush وPR.
9. عند الفشل يعيد التشخيص حتى 3 محاولات.
10. بعد ذلك يضع `agent:blocked` ويكتب السبب في Issue.

## التعلم والذاكرة

الوكيل ما كيغيرش النموذج نفسه. التعلم هنا مراقَب عبر:

- تاريخ Issues وPRs.
- `tasks/state.yml`.
- `.agent-last-diagnosis.json` داخل worktree أثناء التنفيذ.
- قواعد المشروع في `MEMORY.md` و`STRUCTURE.md` و`AGENTS.md`.

راجع patches وPRs المولدة قبل الدمج، خصوصاً عند استعمال `AGENT_AUTO_APPROVE=true`.

## ملاحظات أمنية

- ما تعطيش `OPENAI_API_KEY` داخل Issue.
- ما تفعّلش `AGENT_AUTO_APPROVE` في repository غير موثوق.
- الوكيل كيشغل أوامر الاختبار الموجودة في metadata أو config، لذلك لا تستعمل metadata من مستخدمين غير موثوقين.
- خليه يخدم بحساب Windows عادي، ماشي Administrator.
