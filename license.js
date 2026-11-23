/**
 * نظام الترخيص والتفعيل والتمديد التجريبي (5 أيام)
 * ملف الترخيص الموحد لبرنامج سجل حضور وغياب الموظفين
 */

(function() {
    const PROGRAM_SALT = "ALTHAWWAB_SJELHOTHOR_2026_PRO";
    const SECRET_SALT = PROGRAM_SALT;
    const TRIAL_DURATION_MS = 5 * 24 * 60 * 60 * 1000; // 432,000,000 مللي ثانية (5 أيام بالضبط)

    // دالة تشفير SHA-256 دقيقة ومطابقة لمعيار Web Crypto و Node.js
    function sha256(str) {
        function rightRotate(value, amount) {
            return (value >>> amount) | (value << (32 - amount));
        }
        const mathPow = Math.pow;
        const maxWord = mathPow(2, 32);
        let result = '';
        const words = [];
        const utf8 = unescape(encodeURIComponent(str));
        const asciiBitLength = utf8.length * 8;
        const hash = [];
        const k = [];
        let primeCounter = 0;
        const isComposite = {};
        for (let candidate = 2; primeCounter < 64; candidate++) {
            if (!isComposite[candidate]) {
                for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
                hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
                k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
            }
        }
        let s = utf8 + '\x80';
        while (s.length % 64 !== 56) s += '\x00';
        for (let i = 0; i < s.length; i++) {
            const j = s.charCodeAt(i);
            words[i >> 2] |= j << ((3 - (i % 4)) * 8);
        }
        words[words.length] = Math.floor(asciiBitLength / maxWord);
        words[words.length] = asciiBitLength & 0xffffffff;
        for (let j = 0; j < words.length;) {
            const w = words.slice(j, (j += 16));
            const oldHash = [...hash];
            for (let i = 0; i < 64; i++) {
                const w15 = w[i - 15] || 0, w2 = w[i - 2] || 0;
                const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
                const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
                const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
                const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
                const temp1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (w[i] = i < 16 ? (w[i] || 0) : ((w[i - 16] || 0) + s0 + (w[i - 7] || 0) + s1) | 0)) | 0;
                const temp2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj) | 0;
                hash[7] = hash[6]; hash[6] = hash[5]; hash[5] = hash[4];
                hash[4] = (hash[3] + temp1) | 0;
                hash[3] = hash[2]; hash[2] = hash[1]; hash[1] = hash[0];
                hash[0] = (temp1 + temp2) | 0;
            }
            for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
        }
        for (let i = 0; i < 8; i++) {
            for (let b = 3; b >= 0; b--) {
                const byteVal = (hash[i] >> (8 * b)) & 255;
                result += (byteVal < 16 ? '0' : '') + byteVal.toString(16);
            }
        }
        return result;
    }

    // 1. معادلة كود التفعيل الدائم (مطابقة 100% للمولّد الشامل)
    // احسب التجزئة SHA-256(deviceId + PROGRAM_SALT) بالأحرف الكبيرة، وخذ أول 10 خانات متصلة بدون شرطات
    function computeActivationCode(deviceId) {
        const raw = (deviceId || '').trim() + PROGRAM_SALT;
        return sha256(raw).substring(0, 10).toUpperCase();
    }

    // 2. معادلة كود التمديد التجريبي (5 أيام)
    // احسب التجزئة: "EXT5-" + SHA-256(deviceId + PROGRAM_SALT + "_EXT5").substring(0, 8).toUpperCase()
    function computeExtensionCode(deviceId) {
        const raw = (deviceId || '').trim() + PROGRAM_SALT + "_EXT5";
        const hash = sha256(raw).toUpperCase();
        return "EXT5-" + hash.substring(0, 8);
    }

    // دالة تنسيق عداد الوقت بالأيام والساعات بدقة
    function formatTrialRemaining(remainingMs) {
        if (remainingMs <= 0) return 'انتهت الفترة التجريبية ⚠️';
        const totalHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;

        let daysWord = 'يوم';
        if (days === 1) daysWord = 'يوم';
        else if (days === 2) daysWord = 'يومان';
        else if (days >= 3 && days <= 10) daysWord = 'أيام';
        else daysWord = 'يوماً';

        let hoursWord = 'ساعة';
        if (hours === 1) hoursWord = 'ساعة';
        else if (hours === 2) hoursWord = 'ساعتان';
        else if (hours >= 3 && hours <= 10) hoursWord = 'ساعات';
        else hoursWord = 'ساعة';

        if (days > 0 && hours > 0) {
            return `⏳ فترة تجريبية: متبقي ${days} ${daysWord} و ${hours} ${hoursWord}`;
        } else if (days > 0) {
            return `⏳ فترة تجريبية: متبقي ${days} ${daysWord}`;
        } else if (hours > 0) {
            return `⏳ فترة تجريبية: متبقي ${hours} ${hoursWord}`;
        } else {
            const mins = Math.max(1, Math.floor(remainingMs / (1000 * 60)));
            return `⏳ فترة تجريبية: متبقي ${mins} دقيقة`;
        }
    }

    // 3. التحقق ومعالجة كود التفعيل أو التمديد التجريبي
    function verifyLicenseOrExtensionCode(inputCode, deviceId, storage = null) {
        // تنظيف الكود المدخل تلقائياً
        const code = (inputCode || '').trim().toUpperCase();
        const cleanDeviceId = (deviceId || '').trim();

        if (!code) {
            return {
                success: false,
                error: "يرجى إدخال كود صالح."
            };
        }

        const localStorageObj = storage || (typeof localStorage !== 'undefined' ? localStorage : null);

        const getStorageItem = (key) => {
            if (!localStorageObj) return null;
            if (typeof localStorageObj.getItem === 'function') return localStorageObj.getItem(key);
            return localStorageObj[key] !== undefined ? String(localStorageObj[key]) : null;
        };

        const setStorageItem = (key, val) => {
            if (!localStorageObj) return;
            if (typeof localStorageObj.setItem === 'function') {
                localStorageObj.setItem(key, val);
            } else {
                localStorageObj[key] = val;
            }
        };

        // التحقق هل الكود كود تمديد تجريبي (يبدأ بـ "EXT5-")
        if (code.startsWith("EXT5-")) {
            // فحص الأكواد المستخدمة سابقاً
            let usedCodes = [];
            if (localStorageObj) {
                try {
                    const stored = getStorageItem('used_ext_codes');
                    if (stored) usedCodes = JSON.parse(stored);
                    if (!Array.isArray(usedCodes)) usedCodes = [];
                } catch(e) {
                    usedCodes = [];
                }
            }

            // إذا كان الكود مستخدماً من قبل، ارفضه برسالة محددة
            if (usedCodes.includes(code)) {
                return {
                    success: false,
                    isExtension: true,
                    error: "تم استخدام كود التمديد هذا مسبقاً!"
                };
            }

            const expectedExtCode = computeExtensionCode(cleanDeviceId);
            if (code === expectedExtCode) {
                // حفظ الكود في used_ext_codes لمنع تكراره
                if (!usedCodes.includes(code)) {
                    usedCodes.push(code);
                }
                const now = Date.now();
                const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
                // احتساب تاريخ انتهاء التجربة الجديد: إضافة 5 أيام على الوقت الحالي أو تاريخ الانتهاء الحالي
                const existingEnd = Number(getStorageItem('sjelhothor_trial_end_ts') || getStorageItem('sjelhothor_trial_end') || 0);
                const baseTime = Math.max(now, existingEnd);
                const newTrialEnd = baseTime + FIVE_DAYS_MS;

                if (localStorageObj) {
                    setStorageItem('used_ext_codes', JSON.stringify(usedCodes));
                    setStorageItem('sjelhothor_trial_end_ts', String(newTrialEnd));
                    setStorageItem('sjelhothor_trial_end', String(newTrialEnd));
                    setStorageItem('sjelhothor_first_run', String(now));

                    // حذف جميع مفاتيح ومؤشرات التلاعب بالساعة من localStorage
                    const tamperKeys = [
                        'tamper_lock', 'clock_tampered', 'max_seen_time', 'last_run',
                        'isTampered', 'is_tampered', 'tamper', 'sjelhothor_tamper', 'sjelhothor_tampered'
                    ];
                    tamperKeys.forEach(k => {
                        try { localStorageObj.removeItem(k); } catch(e) {}
                    });
                    // إعادة ضبط مؤشرات وقت التشغيل على اللحظة الحالية Date.now()
                    setStorageItem('last_run', String(now));
                    setStorageItem('sjelhothor_last_seen', String(now));
                }

                return {
                    success: true,
                    isExtension: true,
                    code: code,
                    newTrialEnd: newTrialEnd,
                    sjelhothor_trial_end_ts: newTrialEnd,
                    message: "تم تمديد الفترة التجريبية بنجاح لمدة 5 أيام إضافية!"
                };
            } else {
                return {
                    success: false,
                    isExtension: true,
                    error: "كود التمديد غير صحيح، يُرجى التأكد من الرمز المدخل!"
                };
            }
        }

        // التحقق من كود التفعيل الدائم (مطابقة 100% للمولّد الشامل)
        const expectedPermCode = computeActivationCode(cleanDeviceId);
        if (code === expectedPermCode) {
            const now = Date.now();
            if (localStorageObj) {
                setStorageItem('sjelhothor_activated', 'true');
                setStorageItem('sjelhothor_activation_code', code);

                // حذف جميع مفاتيح ومؤشرات التلاعب بالساعة
                const tamperKeys = [
                    'tamper_lock', 'clock_tampered', 'max_seen_time', 'last_run',
                    'isTampered', 'is_tampered', 'tamper', 'sjelhothor_tamper', 'sjelhothor_tampered'
                ];
                tamperKeys.forEach(k => {
                    try { localStorageObj.removeItem(k); } catch(e) {}
                });
                setStorageItem('last_run', String(now));
                setStorageItem('sjelhothor_last_seen', String(now));
            }

            return {
                success: true,
                isPermanent: true,
                code: code,
                message: "تم تفعيل البرنامج بنجاح مدى الحياة!"
            };
        } else {
            return {
                success: false,
                isPermanent: true,
                error: "كود التفعيل غير صحيح، يُرجى التأكد من الرمز المدخل أو التواصل مع المطور"
            };
        }
    }

    // التصدير لدعم Node.js والمتصفح معاً
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            PROGRAM_SALT,
            SECRET_SALT,
            TRIAL_DURATION_MS,
            sha256,
            computeActivationCode,
            computeExtensionCode,
            formatTrialRemaining,
            verifyLicenseOrExtensionCode
        };
    }
    if (typeof window !== 'undefined') {
        window.PROGRAM_SALT = PROGRAM_SALT;
        window.SECRET_SALT = SECRET_SALT;
        window.TRIAL_DURATION_MS = TRIAL_DURATION_MS;
        window.sha256 = sha256;
        window.computeActivationCode = computeActivationCode;
        window.computeExtensionCode = computeExtensionCode;
        window.formatTrialRemaining = formatTrialRemaining;
        window.verifyLicenseOrExtensionCode = verifyLicenseOrExtensionCode;
    }
})();
