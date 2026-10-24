// ==UserScript==
// @name         JK Base64 Decoder Hotkey
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  웹페이지에서 텍스트를 선택하고 지정키 누르면 Base64 디코딩 후 교체 및 복사
// @author       JKAKK
// @match        *://*/*
// @updateURL    https://raw.githubusercontent.com/junsarakill/jk-base64-decode-hotkey/main/JKBDH.user.js
// @downloadURL  https://raw.githubusercontent.com/junsarakill/jk-base64-decode-hotkey/main/JKBDH.user.js
// @grant        none
// ==/UserScript==

(function()
{
    'use strict';

    // Base64 디코딩 함수 (UTF-8 지원)
    function decodeBase64(base64)
    {
        try
        {
            // 공백 제거 및 URL-safe 문자 치환
            base64 = base64.trim().replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4)
            {
                base64 += '=';
            }
            const binaryString = atob(base64);
            const bytes = Uint8Array.from(binaryString, (m) => m.codePointAt(0));
            return new TextDecoder().decode(bytes);
        }
        catch (e)
        {
            return null;
        }
    }

    // 선택된 텍스트 위치 근처에 토스트 메시지 표시
    function showToast(message, isSuccess = true, rect = null)
    {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: absolute;
            z-index: 999999;
            padding: 10px 16px;
            background: ${isSuccess ? '#2e7d32' : '#c62828'};
            color: white;
            font-size: 13px;
            font-family: sans-serif;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: opacity 0.3s ease;
            max-width: 300px;
            word-break: break-all;
            pointer-events: none;
        `;
        document.body.appendChild(toast);

        let top = 20;
        let left = 20;

        if (rect && (rect.top !== 0 || rect.left !== 0))
        {
            // 선택 영역 바로 위 중앙에 배치
            top = rect.top + window.scrollY - toast.offsetHeight - 10;
            left = rect.left + window.scrollX + (rect.width / 2) - (toast.offsetWidth / 2);

            // 화면 위로 너무 잘리면 선택 영역 아래에 표시
            if (top < window.scrollY)
                top = rect.bottom + window.scrollY + 10;
        }
        else
        {
            // 위치를 못 찾는 경우 화면 우측 상단 기본값
            top = window.scrollY + 20;
            left = window.innerWidth + window.scrollX - 320;
        }

        toast.style.top = `${top}px`;
        toast.style.left = `${left}px`;

        setTimeout(() =>
        {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // 선택된 영역의 텍스트를 디코딩된 텍스트로 교체
    function replaceSelectedText(newText)
    {
        const activeEl = document.activeElement;
        
        // 인풋 또는 텍스트에어리어인 경우 처리
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA'))
        {
            const start = activeEl.selectionStart;
            const end = activeEl.selectionEnd;
            const val = activeEl.value;
            activeEl.value = val.substring(0, start) + newText + val.substring(end);
            activeEl.selectionStart = activeEl.selectionEnd = start + newText.length;
            return true;
        }

        // 일반 웹페이지 본문인 경우 처리
        const selection = window.getSelection();
        if (!selection.rangeCount)
        {
            return false;
        }

        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(newText);
        range.insertNode(textNode);
        
        // 선택 영역 정리
        selection.removeAllRanges();
        return true;
    }

    // 입력 이벤트에 따른 처리
    function eventDispatcher()
    {
        // 텍스트 교체 및 토스트 표시 전, 선택 영역과 좌표를 미리 백업
        let selectedText = window.getSelection().toString();
        const activeEl = document.activeElement;
        let targetRect = null;

        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA'))
        {
            selectedText = activeEl.value.substring(activeEl.selectionStart, activeEl.selectionEnd);
            targetRect = activeEl.getBoundingClientRect();
        }
        else
        {
            const selection = window.getSelection();
            if (selection.rangeCount > 0)
            {
                const range = selection.getRangeAt(0);
                targetRect = range.getBoundingClientRect();
            }
        }

        if (!selectedText)
        {
            showToast('디코딩할 텍스트를 먼저 드래그해주세요.', false, targetRect);
            return;
        }

        const decoded = decodeBase64(selectedText);
        if (decoded !== null)
        {
            const success = replaceSelectedText(decoded);
            if (success)
            {
                navigator.clipboard.writeText(decoded).then(() =>
                {
                    showToast(`디코딩 & 텍스트 교체 완료:\n${decoded.substring(0, 50)}${decoded.length > 50 ? '...' : ''}`, true, targetRect);
                });
            }
            else
                showToast('텍스트 교체에 실패했습니다.', false, targetRect);
        }
        else
            showToast('유효한 Base64 형식이 아닙니다.', false, targetRect);
    }

    // 단축키 이벤트 리스너
    document.addEventListener('keydown', function(e)
    {
        if ((e.ctrlKey && e.code === 'KeyB')
        || (e.altKey && e.code === 'KeyB'))
        {
            eventDispatcher();
        }
    });
})();