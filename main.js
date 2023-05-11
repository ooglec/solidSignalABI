let provider;
let signer;
let price;
const solidAddress = "0xcaE8A39DC4401d0b82f7445262dBe1B5dd75CA9B";//
const usdcAddress = "0x6b52834DDDa183E4C01d20f1421412035c66Da54";//
const chainName = 'Arbitrum Goerli';//
let solidSpendAllowance = 0;
let minimumPurchaseAmount = 0;
let userUsdcBalance = 0;
let maximumRaiseAmount;
let totalAmountRaised;
let presaleEnd;
let notifications = document.createElement('div');
const walletComponent = document.querySelector('#wallet-component');
const anouncementBanner = document.querySelector("#announcement");
const consentModal = document.querySelector("#consent_modal");
const consentModalBtn = document.querySelector("#confirm-consent");
const consentCheckBox = document.querySelector("#checkbox-consent");
const swicthNework = document.querySelector("#switch-link");
const walletBar = document.querySelector("#wallet-bar");
const button = document.getElementById("execute-button");
const connectionButton = document.querySelector('#connect');
const rpc = "https://arbitrum-goerli.public.blastapi.io";//
const serverUrl = "https://solid-signal-dz9t.vercel.app"//
const chains = ["0x66eed", 421613];//
const walletChainId = "0x66eed"//
const blockExplorer = "https://goerli-rollup-explorer.arbitrum.io"//
let acceptedTOS = false

const WalletConnectProvider = window.WalletConnectProvider.default;
const WalletConnect = window.WalletConnect.default;
const QRCodeModal = window.WalletConnectQRCodeModal.default;
let connected = null;


(async function listenForConnection() {
    var walletDivs = document.querySelectorAll('.wallet-instance');
    walletDivs.forEach(function (walletDiv) {
        walletDiv.addEventListener('click', async function () {
            try {
                connectionButton.innerHTML = "Connecting...";
                button.value = "Connecting...";
            } catch (err) {
                console.log(err)
            }
            let id = walletDiv.id;
            if (id == "metamask") {
                if (window.ethereum) {
                    await connect();
                } else {
                    window.open("https://metamask.io/download/", "_blank")
                }
            } else if (id == "trustwallet") {
                if (window.ethereum.isTrust) {
                    await connect();
                } else {
                    window.open("https://trustwallet.com/download", "_blank")
                }
            } else if (id == "ledger-live") {
                await ledgerLive();
            } else if (id == "wallet-connect") {
                await walletConnect();
            }
            // await loadBalance();
            walletComponent.style.display = "none";
            connectionButton.innerHTML = "Disconnect";
            button.value = "Buy"
            disconnectBtnStyle()
            setButtonNormal()
            if (acceptedTOS == false) {
                requetsTosAcceptance()
            }
            await requestChainSwitch();

        });
    });
})();


async function fetchTOSStatus() {
    const maxAttempts = 5;
    let attempt = 0;

    while (attempt < maxAttempts) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10000ms timeout

            let signerAddress = await signer.getAddress()
            let res = await fetch(`${serverUrl}/accepted`, {
                method: "POST",
                body: JSON.stringify({ address: signerAddress }),
                headers: {
                    "Content-Type": "application/json"
                },
                signal: controller.signal // Pass the AbortSignal to the fetch call
            })

            clearTimeout(timeoutId); // Clear the timeout if the fetch succeeded

            if (res.status == 200) {
                let result = await res.json()
                acceptedTOS = result.data.accepted
                return; // Exit the function if the request was successful
            } else {
                console.log(res.status)
                requetsTosAcceptance()
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Fetch timed out, retrying...');
            } else {
                console.log(err);
                return; // If the error is not a timeout, exit the function
            }
        }

        attempt++;
    }

    console.log(`Failed to fetch after ${maxAttempts} attempts`);
}




async function acceptTOS() {
    let checkBox = document.querySelector("#checkbox-consent")

    if (!checkBox.checked) {
        return
    }
    signer = await provider.getSigner();
    const signerAddress = await signer.getAddress()

    const maxAttempts = 5;
    let attempt = 0;
    while (attempt < maxAttempts) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 5000ms timeout

            let res = await fetch(`${serverUrl}/accept`, {
                method: "POST",
                body: JSON.stringify({ address: signerAddress }),
                headers: {
                    "Content-Type": "application/json"
                },
                signal: controller.signal // Pass the AbortSignal to the fetch call
            })

            clearTimeout(timeoutId); // Clear the timeout if the fetch succeeded

            if (res.status == 200) {
                let result = await res.json()
                console.log(result)
                acceptedTOS = result.success
                consentModal.style.display = "none";
                console.log("Accepted: ", result.success)
                info("Accepted Successfully")
                return; // Exit the function if the request was successful
            } else {
                console.log(res.status)
                error("Acceptance Failed")
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Fetch timed out, retrying...');
            } else {
                console.log(err);
                error('An error occurred');
                return; // If the error is not a timeout, exit the function
            }
        }

        attempt++;
    }

    error(`Failed to accept after ${maxAttempts} attempts`);
}


//wallet connections
async function connect() {
    console.log("connecting...")
    try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        signer = provider.getSigner();
        const signerAddress = await signer.getAddress()
        connected = true;
        console.log(`checking the connection status: ${connected}`)
        await loadBalance()
        setAddress(signerAddress)
        await fetchTOSStatus();
        walletComponent.style.display = "none";
        disconnectBtnStyle()
        connectionButton.innerHTML = "Disconnect";
        setButtonNormal()
        button.value = "Buy";

    } catch (err) {
        error("Connection failed!", extractErrorMessage(err.message))
        console.log(err)
    }
}

async function walletConnect() {
    const walletConnectProvider = new WalletConnectProvider({
        rpc: {
            // 421613: "https://arbitrum-goerli.public.blastapi.io	",
            421613: "https://endpoints.omniatech.io/v1/arbitrum/one/public"
        },
    });

    await walletConnectProvider.enable();
    provider = new ethers.providers.Web3Provider(walletConnectProvider);
    signer = await provider.getSigner();
    const signerAddress = await signer.getAddress()
    await loadBalance();
    await fetchTOSStatus();
    setAddress(signerAddress)
    console.log(await signer.getAddress())
    connected = true;
    setButtonNormal()
    connectionButton.innerHTML = "Disconnect";
    disconnectBtnStyle()
    button.value = "Buy";

}

async function ledgerLive() {
    const connector = new WalletConnect({
        bridge: 'https://bridge.walletconnect.org',
        qrcodeModal: QRCodeModal,
        qrcodeModalOptions: {
            mobileLinks: ['ledger'], // Write the exact names of the supported wallets to be shown on mobile
            desktopLinks: ['ledger'], // Use [] to hide the ones displayed in desktop modal if required
            supportedWallets: ['ledger']
        },
    });
    const walletConnectProvider = new WalletConnectProvider({
        rpc: {
            421613: "https://arbitrum-goerli.public.blastapi.io	",
            42161: "https://endpoints.omniatech.io/v1/arbitrum/one/public"
        },
        connector: connector
    });
    await walletConnectProvider.enable();
    provider = new ethers.providers.Web3Provider(walletConnectProvider);
    signer = await provider.getSigner();
    const signerAddress = await signer.getAddress()
    await loadBalance();
    await fetchTOSStatus();
    setAddress(signerAddress)
    connected = true;
    setButtonNormal()
    connectionButton.innerHTML = "Disconnect";
    disconnectBtnStyle()
    button.value = "Buy";

}


//get connected chain


async function init() {
    walletComponent.style.display = "none";
    if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        try {
            signer = provider.getSigner();
            const signerAddress = await signer.getAddress()

            // connectionButton.innerHTML = "Connecting...";
            // button.value = "Connecting...";

            // await loadBalance()
            // connectionButton.innerHTML = "Disconnect";
            // disconnectBtnStyle()
            // setButtonNormal()
            // setAddress(signerAddress)
            let element = document.querySelector('#USDC')
            if (element.value > 0) {
                console.log(element)
                const newValue = parseFloat(element.value);
                document.querySelector('.signal-value').innerHTML = replaceNaNWithZero(newValue / price);
            }
            // await fetchTOSStatus()
            if (!chains.includes(window.ethereum.chainId) && window.ethereum.chainId != undefined) {
                console.log(ethereum.chainId)
                anouncementBanner.style.display = "block";
                console.log("first")
            }
        } catch (err) {
            connectionButton.innerHTML = "Connect Wallet";
            button.value = "Connect Wallet";
            button.disabled = true;
            setButtonNormal()

        }


    } else {
        connectionButton.innerHTML = "Connect Wallet";
        button.value = "Connect Wallet";
        button.disabled = true;
        setButtonNormal()
    }
}


//load info
async function loadAmounts() {
    let localProvider = new ethers.providers.JsonRpcProvider(rpc);
    signer = localProvider.getSigner();
    const abi = signalABI;
    const solidContract = new ethers.Contract(solidAddress, abi, localProvider);
    const amt = await solidContract.usdcRaised();
    const amtConverted = Math.round(ethers.utils.formatUnits(amt, 6) * 100) / 100
    const maxPresale = await solidContract.presaleCap()
    const _minimumPurchaseAmount = await solidContract.minimumPurchaseAmount()
    const prc = await solidContract.presalePrice();
    price = Math.round(ethers.utils.formatEther(prc) * 100) / 100
    maximumRaiseAmount = (Math.round(ethers.utils.formatUnits(maxPresale, 18) * 100) / 100) * price
    minimumPurchaseAmount = (Math.round(ethers.utils.formatUnits(_minimumPurchaseAmount, 6) * 100) / 100)
    totalAmountRaised = amtConverted
    // numeral(1000).format('0,0');
    document.getElementById("price").innerHTML = `$${price}`;
    document.getElementById("funds-raised").innerHTML = `$${numeral(amtConverted).format('0,0')}`;
    document.getElementById("funds-raised-sm").innerHTML = `$${numeral(amtConverted).format('0,0')} USD`;
    document.getElementById("min-purchase").innerHTML = `$${minimumPurchaseAmount}`;
    document.getElementById("maximum-amount").innerHTML = `$${numeral(maximumRaiseAmount).format('0,0')} USDC`;
    document.getElementById("progress-indicator-id").style.width = `${parseInt((amtConverted / maximumRaiseAmount) * 300)}px`;
}

loadAmounts()

async function loadBalance() {
    provider = provider ? provider : new ethers.providers.Web3Provider(window.ethereum);
    let localProvider = new ethers.providers.JsonRpcProvider(rpc);
    const solidContract = new ethers.Contract(solidAddress, signalABI, localProvider);
    const usdcContract = new ethers.Contract(usdcAddress, erc20ABI, localProvider);
    signer = await provider.getSigner()
    // const prc = await solidContract.presalePrice();
    // price = Math.round(ethers.utils.formatEther(prc) * 100) / 100
    const signerAddress = await signer.getAddress();
    const balance = await solidContract.myBalance(signerAddress); //signal value
    const allowance = await usdcContract.allowance(signerAddress, solidAddress);
    const balanceUsdc = await usdcContract.balanceOf(signerAddress);
    solidSpendAllowance = Math.round(ethers.utils.formatUnits(allowance, 6) * 1000) / 1000
    userUsdcBalance = Math.round(ethers.utils.formatUnits(balanceUsdc, 6) * 1000) / 1000

    const formatedUSDCBalance = replaceNaNWithZero(((Math.round(ethers.utils.formatEther(balance) * 100) / 100) * price))
    const formatedSignal = replaceNaNWithZero((Math.round(ethers.utils.formatEther(balance) * 100) / 100))
    document.getElementById("purchase").innerHTML = `$${numeral(formatedUSDCBalance).format("0,0")}`;
    document.getElementById("purchase-signal").innerHTML = `${numeral(formatedSignal).format("0,0")} SIGNAL`;
    // document.getElementById("price").innerHTML = `$${price}`;
    // button.value = "Buy";
    // setButtonNormal()
}

//buy and approve
async function buy() {
    provider = provider ? provider : new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    const signerAddress = await signer.getAddress();
    const solidContract = new ethers.Contract(solidAddress, signalABI, signer);
    const usdcContract = new ethers.Contract(usdcAddress, erc20ABI, signer);
    const value = document.querySelector('#USDC').value;
    const allowance = await usdcContract.allowance(signerAddress, solidAddress);
    const userBalance = await usdcContract.balanceOf(signerAddress)
    const bigNumValue = ethers.utils.parseUnits(value.toString(), 6)
    solidSpendAllowance = Math.round(ethers.utils.formatUnits(allowance, 6) * 1000) / 1000
    if (bigNumValue.gt(userBalance)) {
        error(`Error: Insufficient balance`, 'Check you USDC balance')
        return
    }

    if (parseFloat(value) > solidSpendAllowance) {
        try {

            // const approvalAmt = parseFloat(inputElement.value) > 0 ? parseFloat(inputElement.value) : 500
            const txApprove = await usdcContract.approve(solidAddress, ethers.utils.parseUnits("500", 6))
            await txApprove.wait()
            button.value = "Buy";
            success('Approval successful');
        } catch (err) {
            console.log(err)
            if (err.code === 4001) {
                error(`Error: User rejected the transaction`)
            } else {
                error(`Error: Approval Failed`, extractErrorMessage(err))
            }
        }
    } else {
        try {
            const tx = await solidContract.buy(ethers.utils.parseUnits(value.toString(), 6));
            await tx.wait();
            success(`Transaction successful`, `Purchase of ${value / price} presale signal successful`);
            resetInputs()
        } catch (err) {
            console.log(err)
            if (err.code === 4001) {
                error(`Error: User rejected the transaction`)
            } else {
                error(`Error:`, extractErrorMessage(err))
            }
        }

        await loadAmounts();
        await loadBalance();
    }
}


async function addChain() {
    const ethereum = window.ethereum;
    const data = [{
        chainId: walletChainId,
        chainName: chainName,
        nativeCurrency: {
            name: chainName,
            symbol: 'AGOR',
            decimals: 18 //In number form
        },
        rpcUrls: [rpc],
        blockExplorerUrls: [blockExplorer]
    }];
    await ethereum.request({ method: 'wallet_addEthereumChain', params: data });
}

async function requestChainSwitch() {
    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x66EED' }],
        });
        try {
            await loadAmounts();
            // await loadBalance();
        } catch (err) {
            console.log(err);
        }
    } catch (err) {
        console.log(err);
        await addChain();
    }
    anouncementBanner.style.display = "none"
}

async function requestChainSwitchV2() {
    try {
        await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x66EED' }],
        });
        try {
            await loadAmounts();
            // await loadBalance();
        } catch (err) {
            console.log(err);
        }
    } catch (err) {
        console.log(err);
        await addChain();
    }
}

async function requetsTosAcceptance() {
    consentModal.style.display = "block"
    if (!consentCheckBox.checked) {
        consentModalBtn.disabled = true
        consentModalBtn.style.background = "#0E2137"
    }

}

function checkMinimumPurchase(value, solidSpendAllowance, button) {
    if (connected == null) return;
    console.log(userUsdcBalance)
    button.disabled = false;
    if (userUsdcBalance < value) {
        button.value = "Insufficient Balance";
        button.disabled = true;
        setButtonDim()
    } else {
        if (value < minimumPurchaseAmount) {
            console.log(minimumPurchaseAmount)
            button.disabled = true;
            button.value = "Amount too low";
            setButtonDim()
        } else if (value > solidSpendAllowance) {
            button.value = "Approve";
            setButtonNormal()
        } else if (value <= solidSpendAllowance) {
            button.value = "Buy";
            setButtonNormal()
        }
    }



    if ((totalAmountRaised + value) > maximumRaiseAmount) {
        button.value = "Exceeds Presale Target"
        setButtonDim()
    }
}

function replaceNaNWithZero(value) {
    return isNaN(value) ? 0 : value;
}

function resetInputs() {
    document.querySelector('#USDC').value = 500;
    document.querySelector('.signal-value').innerHTML = 500 / price;
}

function setButtonNormal() {
    button.style.background = "rgba(0, 123, 255, 1)"
    button.style.color = "rgb(255, 255, 255)"
}
function setButtonDim() {
    button.style.background = "rgba(0, 123, 255, 0.2)"
    button.style.color = "rgb(218, 215, 215)"
}

function disconnectBtnStyle() {
    connectionButton.style.background = "#121C2D"
}

function connectBtnStyle() {
    connectionButton.style.background = "rgba(0, 123, 255, 1)"
}


function extractErrorMessage(errorString) {
    const regex = /^Error:\s(.*?)\s\(/;
    const match = regex.exec(errorString);
    const errorMessage = match ? match[1] : '';
    return errorMessage
}

function setAddress(address) {
    let addressBarText = document.querySelector('#address')
    addressBarText.innerHTML = shortenAddress(address)
    walletBar.style.display = "block";
    addressBarText.style.display = "block";
}

function shortenAddress(address, startLength = 6, endLength = 4) {
    if (!address) {
        return "";
    }

    const cleanAddress = address.replace(/^0x/, ""); // Remove '0x' from the start, if present
    const start = cleanAddress.slice(0, startLength);
    const end = cleanAddress.slice(-endLength);

    return `0x${start}...${end}`;
}
function reset(button) {
    button.disabled = false;
    button.value = "Buy";
    setButtonNormal()
}

function error(text, subText = '') {
    beautyToast.error({
        title: text,
        message: subText,
        darkTheme: true,
        backgroundColor: '#0F1621',
        timeout: 4000,
        progressBarColor: 'red',
    });
}

function info(text, subText = '') {
    beautyToast.info({
        title: text,
        message: subText,
        darkTheme: true,
        backgroundColor: '#0F1621',
        timeout: 3000,
        progressBarColor: 'blue',
    });
}



function success(text, subText = '') {
    beautyToast.success({
        title: text,
        message: subText,
        darkTheme: true,
        backgroundColor: '#0F1621',
        timeout: 3000,
        progressBarColor: 'green',
    });
}

function toast(text, bg, subText = '') {
    Toastify({
        text: `${text}\n${subText}`,
        duration: 4000,
        close: true,
        gravity: "top", // `top` or `bottom`
        position: "right", // `left`, `center` or `right`
        stopOnFocus: true,
        style: {
            backgroundImage: bg,
            fontSize: "17px",
            padding: "30px 10px"
        }
    }).showToast();
}



async function isWrongNetwork() {
    const { chainId } = await provider.getNetwork()
    console.log(chains.includes(chainId))
    if (chains.includes(chainId)) {
        return false
    } else {
        return true
    }
}



window.addEventListener('load', async () => {
    document.querySelector('#address').style.display = "none";
    const form = document.getElementById('Form');
    const inputElement = document.querySelector('#USDC');

    form.addEventListener('submit', function (event) {
        console.log("prevented")
        event.preventDefault();
    });
    try {
        await init();
    } catch (err) {
        console.log(err)
    }

    notifications.classList.add("notifications");




    inputElement.addEventListener('input', (event) => {
        button.disabled = false;
        const newValue = parseFloat(event.target.value);
        checkMinimumPurchase(newValue, solidSpendAllowance, button);
        if (newValue < minimumPurchaseAmount) {
            document.querySelector('.signal-value').innerHTML = 0;
            return;
        }
        document.querySelector('.signal-value').innerHTML = replaceNaNWithZero(newValue / price);


    });

    connectionButton.addEventListener('click', async (event) => {
        if (connected == null) {
            walletComponent.style.display = "block";

        } else {
            // try {
            //     localStorage.removeItem("connected");
            //     if (localStorage.getItem("walletconnect")) {
            //         localStorage.removeItem("walletconnect")
            //     }
            // } catch (err) {

            // }
            connected = null;
            connectionButton.innerHTML = "Connect Wallet";
            connectBtnStyle()
            button.value = "Connect Wallet";
            button.disabled = true;
            document.querySelector('#address').style.display = "none";
            walletBar.style.display = "none";
            document.getElementById("purchase").innerHTML = `-`;
            document.getElementById("purchase-signal").innerHTML = `-`;
        }
    })

    document.querySelector("#modal-close").addEventListener('click', () => {
        walletComponent.style.display = "none";
    })

    document.querySelector("#close-consent").addEventListener('click', () => {
        consentModal.style.display = "none";
    })

    button.addEventListener('click', async (event) => {
        console.log(connected)
        event.preventDefault();
        if (connected == null) {
            button.value = "Connect Wallet";
            walletComponent.style.display = "block";
            return
        }


        const { chainId } = await provider.getNetwork()
        console.log('This is the chain id', chainId)

        if (await isWrongNetwork()) {
            info("Wrong Network!", "Switch network to make transactions")
            anouncementBanner.style.display = "block"
            requestChainSwitchV2()
            return
        }

        if (acceptedTOS === false) {
            requetsTosAcceptance()
        }

        if (userUsdcBalance < parseFloat(inputElement.value)) {
            button.value = "Insufficient Balance";
            setButtonDim()
            return;
        }


        if ((totalAmountRaised + parseFloat(inputElement.value)) > maximumRaiseAmount) {
            error("Error: Exceeds Presale Target!", "Presale target exceeded")
            button.value = "Exceeds Presale Target"
            setButtonDim()
            return
        }





        if (totalAmountRaised >= maximumRaiseAmount) {
            error("Error: Presale Target!", "Presale target exceeded")

            return
        }





        if (parseFloat(inputElement.value) < minimumPurchaseAmount || inputElement.value.length <= 0) {
            setButtonDim()
            button.value = "Amount too low"
            return;
        }
        button.value = "Please wait...";
        button.disabled = true;
        try {
            if (acceptedTOS === true) {
                await buy();
            } else {
                //pop up terms of service modal here
                // info("Accept the terms of service to continue")
                requetsTosAcceptance()

            }
            reset(button);
        } catch (err) {
            console.log(err.message);
            error(`Error: Transaction Failed`, extractErrorMessage(err.message))
            reset(button);
            resetInputs();
        }
    });

    consentCheckBox.addEventListener("change", async function (e) {
        console.log(consentCheckBox.checked)
        if (consentCheckBox.checked) {
            consentModalBtn.disabled = false
            consentModalBtn.style.background = "#007BFF"
        } else {
            consentModalBtn.disabled = true
            consentModalBtn.style.background = "#0E2137"
        }
    })

    consentModalBtn.addEventListener("click", async function (e) {
        e.preventDefault()
        try {
            consentModalBtn.value = "Please wait..."
            await acceptTOS()
            consentModalBtn.value = "Confirm"
        } catch (err) {
            error("Error", "Confirmation failed")
        }

    })

    swicthNework.addEventListener("click", async function () {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x66EED' }],
            });
            anouncementBanner.style.display = "none"
        } catch (err) {
            await addChain();
            anouncementBanner.style.display = "none"
        }
    })

    window.ethereum.on('accountsChanged', async function (accounts) {
        if (connected == true) {
            acceptedTOS = false;
            button.disabled = true;
            button.value = "Switching..."
            signer = provider.getSigner();
            const signerAddress = await signer.getAddress()
            console.log(`signer changed ${signerAddress}`)
            await loadBalance();
            await fetchTOSStatus()
            if (acceptedTOS === false) {
                requetsTosAcceptance()
            }
            setAddress(signerAddress)
            reset(button);
        }
    });

    provider.on('accountsChanged', async function (accounts) {
        if (connected == true) {
            acceptedTOS = false;
            button.disabled = true;
            button.value = "Switching..."
            signer = provider.getSigner();
            const signerAddress = await signer.getAddress()
            console.log(`signer changed ${signerAddress}`)
            loadBalance();
            await fetchTOSStatus()
            setAddress(signerAddress)
            reset(button);
        }


    });

    window.ethereum.on('chainChanged', async function (networkId) {

        if (!chains.includes(window.ethereum.chainId) && window.ethereum != undefined) {
            anouncementBanner.style.display = "block";
            console.log("second")

            try {
                await requestChainSwitch();
            } catch (err) {
                console.log(err)
            }
        }
        console.log('chainChanged');
    });

    provider.on('network', async function (networkId) {
        const { chainId } = await provider.getNetwork()
        if (!chains.includes(chainId) && provider != undefined) {
            console.log(chainId)
            anouncementBanner.style.display = "block";
            console.log("third")
            try {
                await requestChainSwitchV2();
            } catch (err) {
                error(`Error: Transaction Failed`, extractErrorMessage(err.message))
                console.log(err)
            }
        } else {
            anouncementBanner.style.display = "none";
        }
        console.log('chainChanged');
    });

    try {
        if (minimumPurchaseAmount.length <= 0) {
            await loadAmounts();
        }
    } catch (err) {
        console.log(err)
    }


});
