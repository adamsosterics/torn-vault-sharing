// ==UserScript==
// @name         Bhaclash's Vault Sharing script
// @namespace    bhaclash.vault-sharing
// @version      2
// @description  Helps with tracking balances in a shared vault
// @author       Bhaclash
// @match        https://www.torn.com/properties.php
// @updateURL    https://github.com/adamsosterics/torn-vault-sharing/raw/main/vault-sharing.user.js
// @downloadURL  https://github.com/adamsosterics/torn-vault-sharing/raw/main/vault-sharing.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    let localStorageKey = "bh:vault_sharing:settings";

    if (window.location.href.indexOf("vault") > -1) {
        let playerName = JSON.parse(document.querySelector("#websocketConnectionData").innerText).playername;
        let { startTime, ownStartingBalance, spouseStartingBalance } = JSON.parse(localStorage.getItem(localStorageKey)) || { startTime: "2023-08-17T14:02", ownStartingBalance: 0, spouseStartingBalance: 0 };

        function parseTransaction(transactionItem) {
            let date = transactionItem.querySelector(".transaction-date").innerText.trim().split("/");
            let time = transactionItem.querySelector(".transaction-time").innerText.trim();
            let datetime = new Date(Date.parse(`20${date[2]}-${date[1]}-${date[0]}T${time}Z`));
            let userLink = transactionItem.querySelector(".user.name");
            let userId = parseInt(userLink.href.split("XID=")[1]);
            let name = userLink.innerText.replace(/[^A-z0-9]/g, "");
            if(!name)
            {
                name = userLink.children[0].title.split(" ")[0];
            }
            let type = transactionItem.querySelector(".type").innerText.replace(/[^A-z]/g, "");
            let amount = transactionItem.querySelector(".amount").innerText.replace(/[^0-9]/g, "");
            let balance = transactionItem.querySelector(".balance").innerText.replace(/[^0-9]/g, "");
            return {datetime: datetime, name: name, userId: userId, type: type, amount: amount, originalBalance: balance};
        }

        function readTransactionData() {
            let transactionData = {};
            let transactionListItems = document.querySelectorAll(".vault-trans-wrap ul li[transaction_id]");
            for (let item of transactionListItems) {
                transactionData[item.getAttribute("transaction_id")] = parseTransaction(item);
            }
            return transactionData;
        }

        function formatBalance(balance) {
            return (balance < 0 ? "-" : "") + "$" + Math.abs(balance).toLocaleString();
        }

        function showBalances(ownBalance, spouseBalance) {
            document.getElementById("vault-sharing-own-balance").innerText = formatBalance(ownBalance);
            document.getElementById("vault-sharing-spouse-balance").innerText = formatBalance(spouseBalance);
        }

        function calculateBalances() {
            let transactionData = readTransactionData();
            let startTimeAsDate = new Date(Date.parse(startTime + "Z"));
            let lastTransactionDate = startTimeAsDate;
            let ownBalance = ownStartingBalance;
            let spouseBalance = spouseStartingBalance;
            let allRelevantTransactionsLoaded = Object.entries(transactionData).filter(e => e[1].datetime <= startTimeAsDate).length > 0;
            if (allRelevantTransactionsLoaded) {
                let relevantTransactions = Object.entries(transactionData).filter(e => e[1].datetime > startTimeAsDate).sort((a, b) => a[1].datetime - b[1].datetime);
                for (let [id, transaction] of relevantTransactions) {
                    let amount = parseInt(transaction.type == "Deposit" ? transaction.amount : -transaction.amount);
                    lastTransactionDate = transaction.datetime;
                    if (transaction.name === playerName) {
                        ownBalance += amount;
                    }
                    else {
                        spouseBalance += amount;
                    }
                }
            }
            return { allRelevantTransactionsLoaded, lastTransactionDate, ownBalance, spouseBalance };
        }

        function calculateAndShowBalances() {
            let result = calculateBalances();
            if (result.allRelevantTransactionsLoaded) {
                showBalances(result.ownBalance, result.spouseBalance);
            }
        }

        function saveSettings() {
            let ownBalanceSetting = Number(document.getElementById("vault-sharing-own-start-balance").value);
            let spouseBalanceSetting = Number(document.getElementById("vault-sharing-spouse-start-balance").value);
            let startTimeSetting = document.getElementById("vault-sharing-start-time").value;
            localStorage.setItem(localStorageKey, JSON.stringify({ startTime: startTimeSetting, ownStartingBalance: ownBalanceSetting, spouseStartingBalance: spouseBalanceSetting }));
        }

        function handleSave() {
            saveSettings();
            ({ startTime, ownStartingBalance, spouseStartingBalance } = JSON.parse(localStorage.getItem(localStorageKey)));
            calculateAndShowBalances();
        }

        // Settings
        function addUI() {
            let html = `
                <div class="title-black top-round m-top10" role="heading" aria-level="5">Vault sharing</div>
                <div class="vault-wrap cont-gray bottom-round">
                    <div class="vault-cont left">
                        <div class="title">
                            <p class="m-top10 bold">Your starting balance</p>
                        </div>
                        <div class="cont torn-divider input-money-group">
                            <input id="vault-sharing-own-start-balance" type="text" class="input-money" value="${ownStartingBalance}" />
                        </div>
                        <div class="cont torn-divider">
                            <p class="m-top10 bold">Your current balance</p>
                        </div>
                        <div class="cont torn-divider">
                            <span id="vault-sharing-own-balance">Scroll more</span>
                        </div>
                    </div>
                    <div class="vault-cont right">
                        <div class="title">
                            <p class="m-top10 bold">Your spouse's starting balance</p>
                        </div>
                        <div class="cont torn-divider input-money-group">
                            <input id="vault-sharing-spouse-start-balance" type="text" class="input-money" value="${spouseStartingBalance}" />
                        </div>
                        <div class="cont torn-divider">
                            <p class="m-top10 bold">Your spouse's current balance</p>
                        </div>
                        <div class="cont torn-divider">
                            <span id="vault-sharing-spouse-balance">Scroll more</span>
                        </div>
                    </div>
                    <div class="vault-cont left torn-divider">
                        <div class="title">
                            <p class="m-top10 bold">Start date</p>
                            <p>
                                <input id="vault-sharing-start-time" type="datetime-local" value="${startTime}" />
                                <span class="btn-wrap silver">
                                    <span class="btn">
                                        <input id="vault-sharing-save-settings" type="button" class="torn-btn" value="SAVE">
                                    </span>
                                </span>
                            </p>
                        </div>
                    </div>
                    <div class="clear"></div>
                </div>
                <hr class="delimiter-999 m-bottom10 m-top10">
            `;
            document.querySelector(".vault-trans-wrap").insertAdjacentHTML("beforebegin", html);
            document.getElementById("vault-sharing-save-settings").addEventListener("click", handleSave);
        }

        // Wiring
        let mutationConfig = { attributes: false, childList: true, subtree: false };

        let newTransactionsLoadedCallback = (mutationList, observer) => {
            calculateAndShowBalances();
        };

        // Callback function to execute when properties-page-wrap gets populated
        let initialCallback = (mutationList, observer) => {
            for (let mutation of mutationList) {
                if (mutation.type === "childList") {
                    for (let node of mutation.addedNodes) {
                        if (node.nodeName === "DIV" && node.classList.contains("property-option")) {
                            observer.disconnect();
                            addUI();
                            let transactionList = node.querySelector(".vault-trans-wrap ul");
                            let transactionListObserver = new MutationObserver(newTransactionsLoadedCallback);
                            calculateAndShowBalances();
                            transactionListObserver.observe(transactionList, mutationConfig);
                        }
                    }
                }
            }
        };

        let initialObserver = new MutationObserver(initialCallback);
        let targetNode = document.getElementById("properties-page-wrap");
        initialObserver.observe(targetNode, mutationConfig);
    }
})();