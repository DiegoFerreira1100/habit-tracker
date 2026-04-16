function showTab(tabName) {
            document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.getElementById(tabName).classList.add('active');
            document.querySelector(`.tab[onclick="showTab('${tabName}')"]`).classList.add('active');
        }

        async function cadastrar(event) {
            event.preventDefault();
            const nome = document.getElementById('cadastroNome').value;
            const senha = document.getElementById('cadastroSenha').value;

            const response = await fetch('/cadastroUser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, senha })
            });

            const data = await response.json();
            if (response.ok) {
                alert(data.mensagem);
                showTab('login');
            } else {
                alert('Erro: ' + data.erro);
            }
        }

        async function login(event) {
            event.preventDefault();
            const nome = document.getElementById('loginNome').value;
            const senha = document.getElementById('loginSenha').value;

            const response = await fetch('/loginUser', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, senha })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                window.location.href = 'dashboard.html';
            } else {
                alert('Erro: ' + data.erro);
            }
        }