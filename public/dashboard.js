const token = localStorage.getItem('token');
        if (!token) window.location.href = 'index.html';

        async function carregarHabitos() {
            const response = await fetch('/habitos', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const habitos = await response.json();
            const lista = document.getElementById('listaHabitos');
            lista.innerHTML = '';
            habitos.forEach(h => {
                const div = document.createElement('div');
                div.className = 'habito';
                div.innerHTML = `
                    <div>
                        <strong>${h.nome}</strong> 🔥 ${h.streak} dias
                    </div>
                    <button class="cumpri" onclick="cumpriHoje(${h.id})" ${h.cumpridoHoje ? 'disabled' : ''}>
                        ${h.cumpridoHoje ? 'Cumprido!' : 'Cumpri hoje'}
                    </button>
                `;
                lista.appendChild(div);
            });
        }

        async function adicionarHabito() {
            const nome = prompt('Nome do hábito:');
            if (!nome) return;

            await fetch('/habitos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ nome })
            });
            carregarHabitos();
        }

        async function cumpriHoje(id) {
        const response = await fetch(`/habitos/${id}/cumprir`, {
        method: 'PUT',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await response.json();
    
        if (response.ok) {
        let mensagem = `🎉 +${data.xpGanho} XP!`;
        if (data.subiuNivel) {
            mensagem += `\n✨ PARABÉNS! Você subiu para o nível ${data.nivel}! ✨`;
        }
        alert(mensagem);
        
        carregarHabitos();
        carregarStatus();  // atualiza barra de XP e nível
        }
}

        async function novoDia() {
            if (confirm('Iniciar um novo dia? Todos os hábitos serão resetados.')) {
                await fetch('/novo-dia', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                carregarHabitos();
            }
        }

        async function carregarStatus() {
        const response = await fetch('/usuario/status', {
        headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await response.json();
    
        document.getElementById('nivelUsuario').innerText = data.nivel;
        document.getElementById('xpAtual').innerText = data.xpProgresso;
        document.getElementById('xpNecessario').innerText = data.xpProximoNivel;
    
        const percentual = (data.xpProgresso / data.xpProximoNivel) * 100;
        document.getElementById('xpProgresso').style.width = percentual + '%';
}

        function sair() {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        }

        carregarHabitos();