const express = require('express');

//Versão do uuid gera números aleatórios;
const { v4: uuidv4 } = require('uuid');

const app = express();

//Middleware (Para receber um JSON);
app.use(express.json());

//Simulando um "banco de dados" com array para guardar as informações;
const customers = [];

//Middleware (Função Intermediária);
function verifyIfExistsAccountCPF(request, response, next) {
    //Antigo: '/statement/cpf:' e 'request.params';
    const { cpf } = request.headers;

    //Usamos find para retornar o objeto, ao contrário do some que retorna "true" ou "false";
    const customer = customers.find(customer => customer.cpf === cpf);
    
    //Validando a conta;
    if (!customer) {
        return response.status(400).json({error: "Customer not found!"});
    };

    request.customer = customer;

    return next();
};

function getBalance(statement) {
    //"REDUCE" para pegar as informações de um valor e transformar todos esses valores em um;
    const balance = statement.reduce((accumulator, operation) => {
        if (operation.type === 'credit') {
            return accumulator + operation.amount;
        } else {
            return accumulator - operation.amount;
        }
    }, 0); //Valor de inicialização do "reduce";

    return balance;
};

//Criando o Cadastro;
app.post("/account", (request, response) => {
    const { cpf, name } = request.body;

    //Verificando se ja existe um cpf;
    const customersAlreadyExists = customers.some(
        (customer) => customer.cpf === cpf
    );

    if (customersAlreadyExists) {
        return response.status(400).json({error: "Customer Already Exists!"});
    };

    customers.push({
        name,
        cpf,
        id: uuidv4(),
        statement: [],
    });

    return response.status(201).send();
});

//app.use(verifyIfExistsAccountCPF)

//Buscando Extrato do Cliente;
app.get("/statement", verifyIfExistsAccountCPF, (request, response) => {//Usando o Middleware;
    const { customer } = request;
    return response.json(customer.statement);
});

//Criando Depósito;
app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => {
    const { description, amount } = request.body;
    const { customer } = request;

    const statementOperation = {
        description,
        amount,
        created_at: new Date(),
        type:"credit",
    };

    customer.statement.push(statementOperation);

    return response.status(201).send();
});

//Criando Saque;
app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
    const { amount } = request.body;
    const { customer } = request;
    const balance = getBalance(customer.statement);

    //Verificar se pode fazer a operação se saque;
    if (balance < amount) {
        return response.status(400).json({error: 'Insuficient Money!'});
    }

    const statementOperation = {
        amount,
        created_at: new Date(),
        type:"debit",
    };

    customer.statement.push(statementOperation);

    return response.status(201).send();
});

//Buscar_Listar Extrato Bancário por Data;
app.get("/statement/date", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    const { date } = request.query;

    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter((statement) => 
    statement.created_at.toDateString() === new Date(dateFormat).toDateString());

    return response.json(statement);
});

app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { name } = request.body;
    const { customer } = request;

    customer.name = name;

    return response.status(201).send();
});

app.get("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    return response.json(customer);
});

app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;

    //Usando Splice para deleção;
    customers.splice(customer, 1);

    return response.status(200).json(customers);
});

app.get("/balance", verifyIfExistsAccountCPF, (request, response) => {
    const { customer } = request;
    const balance = getBalance(customer.statement);

    return response.json(balance);
});

app.listen(3333);
