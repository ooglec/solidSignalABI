let provider;
let signer;
let price;
const solidAddress = "0x45846bD83C49ee0148354a491703cad98Da17Dfc";
const usdcAddress = "0x6b52834DDDa183E4C01d20f1421412035c66Da54";
const chainName = 'Arbitrum Goerli';
let solidSpendAllowance = 0;
const minimumPurchaseAmount = 500;
let maximumRaiseAmount;
const walletComponent = document.querySelector('#wallet-component');
const anouncementBanner = document.querySelector("#announcement");
const swicthNework = document.querySelector("#switch-link");
const button = document.getElementById("execute-button");
const connectionButton = document.querySelector('#connect');
const rpc = "https://arbitrum-goerli.public.blastapi.io";
const chains = ["0x66eed"];
const walletChainId = "0x66eed"
const blockExplorer = "https://goerli-rollup-explorer.arbitrum.io"

const WalletConnectProvider = window.WalletConnectProvider.default;
const WalletConnect = window.WalletConnect.default;
const QRCodeModal = window.WalletConnectQRCodeModal.default;


(async function listenForConnection() {
    var walletDivs = document.querySelectorAll('.wallet-instance');
    walletDivs.forEach(function (walletDiv) {
        walletDiv.addEventListener('click', async function () {
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
            walletComponent.style.display = "none";
            button.value = "Buy"
            requestChainSwitch();
            await loadBalance();



        });
    });
})();


async function connect() {
    try {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        signer = provider.getSigner();
        const signerAddress = await signer.getAddress()
        setAddress(signerAddress)
        connectionButton.innerHTML = "Disconnect";
        button.value = "Approve";
        localStorage.setItem("connected", true);
        walletComponent.style.display = "none";
        await loadBalance()
    } catch (err) {
        error("Connection failed")
        console.log(err)
    }
}

async function walletConnect() {
    const walletConnectProvider = new WalletConnectProvider({
        rpc: {
            421613: "https://arbitrum-goerli.public.blastapi.io	",
            42161: "https://endpoints.omniatech.io/v1/arbitrum/one/public"
        },
    });

    await walletConnectProvider.enable();
    provider = new ethers.providers.Web3Provider(walletConnectProvider);
    signer = provider.getSigner();
    const signerAddress = await signer.getAddress()
    setAddress(signerAddress)
    console.log(await signer.getAddress())
    localStorage.setItem("connected", true);
    connectionButton.innerHTML = "Disconnect";
    button.value = "Approve";
}

async function ledgerLive() {
    const connector = new WalletConnect({
        bridge: 'https://bridge.walletconnect.org',
        qrcodeModal: QRCodeModal,
        qrcodeModalOptions: {
            mobileLinks: ['ledger'], // Write the exact names of the supported wallets to be shown on mobile
            desktopLinks: ['ledger'], // Use [] to hide the ones displayed in desktop modal if required
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
    signer = provider.getSigner();
    const signerAddress = await signer.getAddress()
    setAddress(signerAddress)
    localStorage.setItem("connected", true);
    connectionButton.innerHTML = "Disconnect";
    button.value = "Approve";
}


//get connected chain


async function init() {
    walletComponent.style.display = "none";
    if (window.ethereum) {
        localStorage.setItem("connected", true);
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        const signerAddress = await signer.getAddress()
        await loadBalance()
        connectionButton.innerHTML = "Disconnect";
        setAddress(signerAddress)
    } else {
        if (!chains.includes(window.ethereum.chainId) && window.ethereum.chainId) {
            anouncementBanner.style.display = "block";
        }
        connectionButton.innerHTML = "Connect Wallet";
        button.value = "Connect Wallet";
        localStorage.removeItem("connected");
    }
}

async function loadAmounts() {
    let localProvider = new ethers.providers.JsonRpcProvider(rpc);
    signer = localProvider.getSigner();
    const abi = signalABI;
    console.log(signalABI);
    const solidContract = new ethers.Contract(solidAddress, abi, localProvider);
    const amt = await solidContract.usdcRaised();
    const amtConverted = Math.round(ethers.utils.formatUnits(amt, 6) * 100) / 100
    const prc = await solidContract.presalePrice();
    const maxPresale = await solidContract.presaleCap()
    price = Math.round(ethers.utils.formatEther(prc) * 100) / 100
    maximumRaiseAmount = (Math.round(ethers.utils.formatUnits(maxPresale, 18) * 100) / 100) * price
    document.getElementById("funds-raised").innerHTML = `$${amtConverted}`;
    document.getElementById("funds-raised-sm").innerHTML = `$${amtConverted} USD`;
    document.getElementById("price").innerHTML = `$${price}`;
    document.getElementById("maximum-amount").innerHTML = `$${maximumRaiseAmount} USDC`;
    document.getElementById("progress-indicator-id").style.width = `${parseInt((amtConverted / maximumRaiseAmount) * 300)}px`;
}

async function loadBalance() {
    provider = provider ? provider : new ethers.providers.Web3Provider(window.ethereum);
    let localProvider = new ethers.providers.JsonRpcProvider(rpc);
    const solidContract = new ethers.Contract(solidAddress, signalABI, localProvider);
    const usdcContract = new ethers.Contract(usdcAddress, erc20ABI, localProvider);
    signer = await provider.getSigner()
    const signerAddress = await signer.getAddress();
    const balance = await solidContract.myBalance(signerAddress);
    const allowance = await usdcContract.allowance(signerAddress, solidAddress);
    solidSpendAllowance = Math.round(ethers.utils.formatUnits(allowance, 6) * 1000) / 1000
    document.getElementById("purchase").innerHTML = `$${(Math.round(ethers.utils.formatEther(balance) * 100) / 100) * price}`;
    document.getElementById("purchase-signal").innerHTML = `${(Math.round(ethers.utils.formatEther(balance) * 100) / 100)} SIGNAL`;
    button.value = "Buy";
}


async function buy() {
    provider = provider ? provider : new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    const signerAddress = await signer.getAddress();
    const solidContract = new ethers.Contract(solidAddress, signalABI, signer);
    const usdcContract = new ethers.Contract(usdcAddress, erc20ABI, signer);
    const value = document.querySelector('#USDC').value;
    const allowance = await usdcContract.allowance(signerAddress, solidAddress);
    solidSpendAllowance = Math.round(ethers.utils.formatUnits(allowance, 6) * 1000) / 1000
    if (parseFloat(value) > solidSpendAllowance) {
        try {
            await usdcContract.approve(solidAddress, ethers.constants.MaxUint256);
            button.value = "Buy";
            success('Approval successful');
        } catch (err) {
            error(`Error: Approval Failed`)
        }
    } else {
        try {
            const tx = await solidContract.buy(ethers.utils.parseUnits(value.toString(), 6));
            await tx.wait();
            success(`Purchase of ${value / price} successful`);
            resetInputs()
        } catch (err) {
            error(`Error: Transaction Failed`)
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
            name: 'AGOR',
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


function checkMinimumPurchase(value, solidSpendAllowance, button) {
    if (localStorage.getItem("connected") == null) return;
    if (value > solidSpendAllowance) {
        button.value = "Approve";
    } else {
        button.value = "Buy";
    }
    if (value < minimumPurchaseAmount) {
        button.disabled = true;
        button.value = "Amount too low";
    } else {
        button.disabled = false;
    }
}

function resetInputs() {
    document.querySelector('#USDC').value = 0;
    document.querySelector('.signal-value').innerHTML = 0;
}

function setAddress(address) {
    let addressBarText = document.querySelector('#address')
    addressBarText.innerHTML = shortenAddress(address)
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
}

function error(text) {
    toast(text, "linear-gradient(to right, #ed213a, #93291e)");
}

function success(text) {
    toast(text, "linear-gradient(to right, #00b09b, #96c93d)");
}

function toast(text, bg) {
    Toastify({
        text: text,
        duration: 3000,
        style: {
            background: bg,
            fontSize: "17px"
        }
    }).showToast();
}

function isWrongNetwork() {
    if (chains.includes(provider.chainId) || chains.includes(window.ethereum.chainId)) {
        return false
    } else {
        error("Wrong Network: Switch network to make transactions")
        return true
    }
}



window.addEventListener('load', async () => {
    document.querySelector('#address').style.display = "none";
    try {
        init();
        await loadAmounts();
    } catch (err) {
        console.log(err)
    }

    const inputElement = document.querySelector('#USDC');
    var form = document.getElementById('Form');



    inputElement.addEventListener('input', (event) => {
        const newValue = parseFloat(event.target.value);
        document.querySelector('.signal-value').innerHTML = newValue / price;
        checkMinimumPurchase(newValue, solidSpendAllowance, button);
    });

    connectionButton.addEventListener('click', async (event) => {
        if (localStorage.getItem("connected") == null) {
            walletComponent.style.display = "block";
        } else {
            localStorage.removeItem("connected");
            connectionButton.innerHTML = "Connect Wallet";
            button.value = "Connect Wallet";
            addressBarText.style.display = "none";
        }
    })

    document.querySelector("#modal-close").addEventListener('click', () => {
        walletComponent.style.display = "none";
    })

    button.addEventListener('click', async (event) => {
        if (localStorage.getItem("connected") == null) {
            button.value = "Connect Wallet";
            walletComponent.style.display = "block";
            return
        }

        if (isWrongNetwork()) {
            return
        }
        if (parseFloat(inputElement.value) < minimumPurchaseAmount || inputElement.value.length <= 0) {
            return;
        }
        button.value = "Please wait...";
        button.disabled = true;
        try {
            await buy();
            reset(button);
        } catch (err) {
            console.log(err.message);
            reset(button);
            resetInputs();
        }
    });

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

    window.ethereum.on('accountsChanged', function (accounts) {
        loadBalance();
    });

    provider.on('accountsChanged', function (accounts) {
        loadBalance();
    });

    window.ethereum.on('chainChanged', async function (networkId) {
        if (!chains.includes(window.ethereum.chainId)) {
            anouncementBanner.style.display = "block";
            try {
                await requestChainSwitch();
            } catch (err) {
                console.log(err)
            }
        }
        console.log('chainChanged');
    });

    provider.on('network', async function (networkId) {

        if (!chains.includes(provider.chainId)) {
            anouncementBanner.style.display = "block";
            try {
                await requestChainSwitchV2();
            } catch (err) {
                console.log(err)
            }
        }
        console.log('chainChanged');
    });

    form.addEventListener('submit', function (event) {
        event.preventDefault();
    });
});
