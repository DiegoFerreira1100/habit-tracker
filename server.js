const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SECRET_KEY = 'sua-chave-secreta-aqui';

const port = 3000;


const servidor = express();
servidor.use(express.json());
servidor.use(express.static('public'));


//funções
function lerUsuarios() {
    const dados = fs.readFileSync('./dados/usuarios.json', 'utf8');
    return JSON.parse(dados);
}

function salvarUsuarios(usuarios) {
    fs.writeFileSync('./dados/usuarios.json', JSON.stringify(usuarios));
}

function lerHabitos() {
    const habitos = fs.readFileSync('./dados/habitos.json','utf8');
    return JSON.parse(habitos);
}

function salvarHabitos(habitos) {
    fs.writeFileSync('./dados/habitos.json', JSON.stringify(habitos));
}

function calcularNivel(xp) {
    let nivel = 1;
    let xpNecessario = 100;
    
    while (xp >= xpNecessario) {
        nivel++;
        xpNecessario = 100 + (nivel * 50);
    }
    return nivel;
}

//rotas

//cadastro
servidor.post('/cadastroUser',(req,res)=>{
    const novoUser = req.body;


    if(!novoUser.nome || novoUser.nome.trim()===''){
        return res.status(400).json({erro:"nome faltando"});
    }
    if(!novoUser.senha || novoUser.senha.trim()===''){
        return res.status(400).json({erro:"senha faltando"});
    }

    const saltRounds = 10; 
    const hashSenha = bcrypt.hashSync(novoUser.senha, saltRounds);

    const usuario = {
        id: Date.now(),
        xp: 0,
        nivel:1,
        nome: novoUser.nome,
        senha: hashSenha
    };

    const listaUsuarios = lerUsuarios();
    listaUsuarios.push(usuario);
    salvarUsuarios(listaUsuarios);
    res.status(201).json({ mensagem: "Usuário criado com sucesso!" });

})

//login
servidor.post('/loginUser', async(req,res)=>{
    const nome = req.body.nome;
    const senha = req.body.senha;
    const listaUsuarios = lerUsuarios();
    const usuarioEncontrado = listaUsuarios.find(u => u.nome === nome);
    if(!usuarioEncontrado){
        return res.status(401).json({ erro: "Usuário ou senha incorretos." });
    };

    const senhaCorreta = await bcrypt.compare(senha, usuarioEncontrado.senha);
    if (senhaCorreta) {
        const token = jwt.sign(
    { id: usuarioEncontrado.id, nome: usuarioEncontrado.nome }, 
    SECRET_KEY, 
    { expiresIn: '1h' } 
    );
        return res.json({ mensagem: "Login bem-sucedido!", token: token });
    } else {
        res.status(401).json({ erro: "Usuário ou senha inválidos" });
    }
});


function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ erro: "Token não fornecido" });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.usuarioId = decoded.id;
        next();
    } catch (error) {
        return res.status(403).json({ erro: "Token inválido ou expirado" });
    }
}


// rotas hábitos
servidor.get('/habitos', verificarToken, (req, res) => {
    const habitos = lerHabitos();
    const habitosUsuario = habitos.filter(h => h.usuarioId === req.usuarioId);
    res.json(habitosUsuario);
});

// Criar novo hábito
servidor.post('/habitos', verificarToken, (req, res) => {
    const { nome } = req.body;
    if (!nome || nome.trim() === '') {
        return res.status(400).json({ erro: "Nome do hábito é obrigatório" });
    }

    const novoHabito = {
        id: Date.now(),
        nome: nome.trim(),
        usuarioId: req.usuarioId,
        cumpridoHoje: false,
        streak: 0
    };

    const habitos = lerHabitos();
    habitos.push(novoHabito);
    salvarHabitos(habitos);

    res.status(201).json(novoHabito);
});

// Marcar como cumprido
servidor.put('/habitos/:id/cumprir', verificarToken, (req, res) => {
    const habitos = lerHabitos();
    const usuarios = lerUsuarios();
    
    const habito = habitos.find(h => h.id == req.params.id && h.usuarioId === req.usuarioId);
    if (!habito) return res.status(404).json({ erro: "Hábito não encontrado" });
    
    if (habito.cumpridoHoje) {
        return res.status(400).json({ erro: "Hábito já cumprido hoje" });
    }
    
    // Atualizar hábito
    habito.cumpridoHoje = true;
    habito.streak += 1;
    
    // Calcular XP ganho
    const xpGanho = 10 + (habito.streak * 5);
    
    // Atualizar usuário
    const usuarioIndex = usuarios.findIndex(u => u.id === req.usuarioId);
    const xpAntes = usuarios[usuarioIndex].xp || 0;
    const nivelAntes = usuarios[usuarioIndex].nivel || 1;
    
    usuarios[usuarioIndex].xp = xpAntes + xpGanho;
    usuarios[usuarioIndex].nivel = calcularNivel(usuarios[usuarioIndex].xp);
    
    salvarHabitos(habitos);
    salvarUsuarios(usuarios);
    
    res.json({ 
        habito, 
        xpGanho, 
        xpTotal: usuarios[usuarioIndex].xp,
        nivel: usuarios[usuarioIndex].nivel,
        subiuNivel: usuarios[usuarioIndex].nivel > nivelAntes
    });
});

// Novo dia (resetar cumpridoHoje)
servidor.post('/novo-dia', verificarToken, (req, res) => {
    const habitos = lerHabitos();
    const habitosUsuario = habitos.filter(h => h.usuarioId === req.usuarioId);
    
    habitosUsuario.forEach(h => {
        h.cumpridoHoje = false;
    });

    salvarHabitos(habitos);
    res.json({ mensagem: "Status de hoje resetado para todos os hábitos." });
});

servidor.get('/usuario/status', verificarToken, (req, res) => {
    const usuarios = lerUsuarios();
    const usuario = usuarios.find(u => u.id === req.usuarioId);
    
    // XP necessário para o PRÓXIMO nível
    const xpProximoNivel = 100 + (usuario.nivel * 50);
    
    // XP base do nível atual (quanto precisou para chegar aqui)
    let xpBaseNivel = 0;
    for (let i = 1; i < usuario.nivel; i++) {
        xpBaseNivel += 100 + (i * 50);
    }
    
    // XP atual dentro do nível (0 até xpProximoNivel)
    const xpProgresso = usuario.xp - xpBaseNivel;
    
    res.json({
        nivel: usuario.nivel,
        xp: usuario.xp,
        xpProximoNivel: xpProximoNivel,
        xpProgresso: xpProgresso
    });
});

function calcularXpAteNivel(nivel) {
    // Retorna XP TOTAL necessário para chegar a um determinado nível
    let total = 0;
    for (let i = 1; i < nivel; i++) {
        total += 100 + (i * 50);
    }
    return total;
}



servidor.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});