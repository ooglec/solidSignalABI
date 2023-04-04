let provider;
let signer;
let price;
const solidAddress = "0x3E270f23EcaC0c96ED7329Bf0D9cFC0Ce96f2123";
const usdcAddress = "0x6b52834DDDa183E4C01d20f1421412035c66Da54";
let solidSpendAllowance = 0;
const minimumPurchaseAmount = 500;
let maximumRaiseAmount;
const walletComponent = document.querySelector('#wallet-component');
const button = document.getElementById("execute-button");
const connectionButton = document.querySelector('#connect');
const rpc = "https://endpoints.omniatech.io/v1/arbitrum/goerli/public";
const chains = ["0x66eed"];



(async function listenForConnection() {
    var walletDivs = document.querySelectorAll('.wallet-instance');
    walletDivs.forEach(function (walletDiv) {
        walletDiv.addEventListener('click', async function () {
            connect();
            requestChainSwitch();
            await loadBalance();
            walletComponent.style.display = "none";
            button.value = "Disconnect";

        });
    });
})();


async function connect() {
    provider = new ethers.providers.Web3Provider(window.ethereum);

    await window.ethereum.request({ method: 'eth_requestAccounts' });

    signer = provider.getSigner();
    connectionButton.innerHTML = "Disconnect";
    button.value = "Approve";
    localStorage.setItem("connected", true);
    walletComponent.style.display = "none";
}

async function init() {
    walletComponent.style.display = "none";
    if (window.ethereum && window.ethereum.selectedAddress) {
        localStorage.setItem("connected", true);
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        connectionButton.innerHTML = "Disconnect";
        requestChainSwitch();
    }
    connectionButton.innerHTML = "Connect Wallet";
    localStorage.removeItem("connected");
}

async function loadAmounts() {
    provider = window.ethereum ? new ethers.providers.Web3Provider(window.ethereum) : new ethers.providers.JsonRPCProvider(rpc);
    signer = provider.getSigner();
    const abi = signalABI;
    console.log(signalABI);
    const solidContract = new ethers.Contract(solidAddress, abi, provider);
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
    const solidContract = new ethers.Contract(solidAddress, signalABI, provider);
    const usdcContract = new ethers.Contract(usdcAddress, erc20ABI, provider);
    const signerAddress = await signer.getAddress();
    const balance = await solidContract.myBalance(signerAddress);
    const allowance = await usdcContract.allowance(signerAddress, solidAddress);
    solidSpendAllowance = Math.round(ethers.utils.formatUnits(allowance, 6) * 1000) / 1000
    document.getElementById("purchase").innerHTML = `$${(Math.round(ethers.utils.formatEther(balance) * 100) / 100) * price}`;
    document.getElementById("purchase-signal").innerHTML = `${(Math.round(ethers.utils.formatEther(balance) * 100) / 100)} SIGNAL`;
    button.value = "Buy";
}


async function buy() {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    const solidContract = new ethers.Contract(solidAddress, signalABI, signer);
    const usdcContract = new ethers.Contract(usdcAddress, erc20ABI, signer);
    const value = document.querySelector('#USDC').value;
    if (parseFloat(value) > solidSpendAllowance) {
        await usdcContract.approve(solidAddress, ethers.constants.MaxUint256);
        button.value = "Buy";
        success('Approval successful');
    } else {
        const tx = await solidContract.buy(ethers.utils.parseUnits(value.toString(), 6));
        await tx.wait();
        success(`Purchase of ${value * price} successful`);
        resetInputs()
        await loadAmounts();
    }
    await loadBalance();
}

async function requestChainSwitch() {
    await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x66EED' }],
    });
    try {
        await loadAmounts();
        await loadBalance();
    } catch (err) {
        console.log(err);
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
            fontSize: "18px"
        }
    }).showToast();
}



window.addEventListener('load', async () => {
    try {
        init();
        await loadAmounts();
    } catch (err) { }

    const inputElement = document.querySelector('#USDC');
    var form = document.getElementById('Form');



    inputElement.addEventListener('input', (event) => {
        const newValue = parseFloat(event.target.value);
        document.querySelector('.signal-value').innerHTML = newValue * price;
        checkMinimumPurchase(newValue, solidSpendAllowance, button);
    });

    connectionButton.addEventListener('click', async (event) => {
        if (localStorage.getItem("connected") == null) {
            walletComponent.style.display = "block";
        } else {
            localStorage.removeItem("connected");
            connectionButton.innerHTML = "Connect Wallet";
            button.value = "Connect Wallet";
        }
    })

    document.querySelector("#modal-close").addEventListener('click', () => {
        walletComponent.style.display = "none";
    })

    button.addEventListener('click', async (event) => {
        if (localStorage.getItem("connected") == null) {
            button.value = "Connect Wallet";
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
            error(`Error: ${err.message} `);
            console.log(JSON.parse(err.message));
            reset(button);
            resetInputs();
        }
    });

    window.ethereum.on('accountsChanged', function (accounts) {
        loadBalance();
    });

    window.ethereum.on('networkChanged', async function (networkId) {
        if (!chains.includes(window.ethereum.chainId)) {
            try {
                requestChainSwitch();
            } catch (err) {
                console.log(err)
            }
        }
        console.log('networkChanged');
    });


    form.addEventListener('submit', function (event) {
        event.preventDefault();
    });
});
