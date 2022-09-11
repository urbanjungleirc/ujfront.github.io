const url='https://script.google.com/macros/s/AKfycbyvFZY5PQvWJ9eNiPQV_865IbL6ic7DILWsR6o-K0HJBhIiSv2tmIGlQRA-V-KqQTb1/exec';
const btn = document.querySelector('.btn');
const output = document.querySelector('.output');

btn.textContent = 'Start Game';
btn.onclick = startGame;
const comps = {data: {}};

function startGame(){
    btn.style.display = 'none';
    output.innerHTML = 'Loading data...';
    fetch (url)
    .then (res => res.json())
    .then (data => {
        console.log (data);
        comps.data = data;  
        outputData();
    })
}

function outputData() {
    output.innerHTML = '';
    comps.data.forEach(comp => {
        console.log (comp.name);
        const el = maker('h2',output,'comp',comp.name);
        const list =maker('ul',output,'list','');
        comp.details.forEach(atr => {
            const val = maker('li',list,'value',atr);
        })
    })
}

function maker(t,parent, cl,h) {
    const el = document.createElement(t);
    el.classList.add(cl);
    el.textContent = h;
    return parent.appendChild(el);
}