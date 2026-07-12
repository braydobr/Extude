// 1. FUNÇÃO GLOBAL (Fica de fora para que qualquer arquivo HTML consiga usá-la)
function validarCPF(cpf) {
    // Remove tudo o que não for número
    cpf = cpf.replace(/\D/g, '');

    // Verifica se tem 11 dígitos ou se é uma sequência repetida (ex: 111.111.111-11)
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let soma = 0, resto;

    // Validação do primeiro dígito verificador
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    // Validação do segundo dígito verificador
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true; // Se passar por tudo, o CPF é válido
}

// 2. MÁSCARA E EVENTOS DA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    // Busca o campo de CPF pelo ID
    const cpfInput = document.getElementById('cpf');

    // SÓ EXECUTA A MÁSCARA SE O CAMPO DE CPF EXISTIR NA PÁGINA
    if (cpfInput) {
        cpfInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.slice(0, 11);
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });
    }
});