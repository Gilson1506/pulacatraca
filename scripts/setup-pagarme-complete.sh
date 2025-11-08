#!/bin/bash

# ========================================
# 🚀 CONFIGURAÇÃO COMPLETA DO PAGAR.ME
# ========================================
# Script para configurar integração Pagar.me
# Usa npx para garantir disponibilidade do Supabase CLI
# ========================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Função para imprimir com cores
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "${PURPLE}🎯 $1${NC}"
    echo "====================================="
}

print_section() {
    echo -e "${CYAN}📋 $1${NC}"
    echo "-------------------------------------"
}

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Função para executar comando com npx se necessário
run_supabase() {
    if command_exists supabase; then
        supabase "$@"
    else
        npx supabase "$@"
    fi
}

# Função para aguardar confirmação do usuário
confirm_action() {
    local message="$1"
    echo -e "${YELLOW}$message${NC}"
    read -p "Continuar? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Operação cancelada pelo usuário"
        exit 1
    fi
}

# Função para limpar tela
clear_screen() {
    clear
    echo -e "${PURPLE}🚀 CONFIGURAÇÃO COMPLETA DO PAGAR.ME${NC}"
    echo "====================================="
    echo ""
}

# Função principal
main() {
    clear_screen
    
    print_header "VERIFICANDO PRÉ-REQUISITOS"
    
    # Verificar se Node.js está instalado
    if ! command_exists node; then
        print_error "Node.js não está instalado!"
        echo "Instale o Node.js em: https://nodejs.org/"
        exit 1
    fi
    
    print_status "Node.js encontrado: $(node --version)"
    
    # Verificar se npm está disponível
    if ! command_exists npm; then
        print_error "npm não está disponível!"
        exit 1
    fi
    
    print_status "npm encontrado: $(npm --version)"
    
    # Verificar se npx está disponível
    if ! command_exists npx; then
        print_error "npx não está disponível!"
        exit 1
    fi
    
    print_status "npx encontrado: $(npx --version)"
    
    echo ""
    
    # PASSO 1: Verificar status atual
    print_header "PASSO 1: VERIFICANDO STATUS ATUAL"
    
    print_info "Listando functions atuais..."
    run_supabase functions list
    
    echo ""
    confirm_action "Verificou as functions atuais? Pode continuar?"
    echo ""
    
    # PASSO 2: Remover functions antigas do Stripe
    print_header "PASSO 2: REMOVENDO FUNCTIONS ANTIGAS DO STRIPE"
    
    local stripe_functions=(
        "create-checkout-session"
        "create-event-product"
        "create-payment-intent"
        "create-subscription"
        "get-customer-portal"
        "refund-payment"
        "stripe-webhook"
    )
    
    for func in "${stripe_functions[@]}"; do
        print_info "Removendo $func..."
        if run_supabase functions delete "$func" --yes 2>/dev/null; then
            print_status "$func removida com sucesso"
        else
            print_warning "$func não encontrada ou já removida"
        fi
    done
    
    echo ""
    print_status "Todas as functions antigas foram processadas"
    echo ""
    
    # PASSO 3: Verificar remoção
    print_header "PASSO 3: VERIFICANDO REMOÇÃO"
    
    print_info "Listando functions após remoção..."
    run_supabase functions list
    
    echo ""
    confirm_action "Verificou que as functions antigas foram removidas? Pode continuar?"
    echo ""
    
    # PASSO 4: Deploy das novas functions do Pagar.me
    print_header "PASSO 4: DEPLOY DAS NOVAS FUNCTIONS DO PAGAR.ME"
    
    local pagarme_functions=(
        "process-payment"
        "get-payment-status"
        "cancel-payment"
    )
    
    for func in "${pagarme_functions[@]}"; do
        print_info "Deploy $func..."
        if run_supabase functions deploy "$func"; then
            print_status "$func deployada com sucesso"
        else
            print_error "Erro ao fazer deploy de $func"
            confirm_action "Continuar mesmo com erro em $func?"
        fi
        echo ""
    done
    
    echo ""
    print_status "Deploy das functions concluído"
    echo ""
    
    # PASSO 5: Verificar deploy
    print_header "PASSO 5: VERIFICAÇÃO FINAL"
    
    print_info "Listando functions após deploy..."
    run_supabase functions list
    
    echo ""
    confirm_action "Verificou que as novas functions foram deployadas? Pode continuar?"
    echo ""
    
    # PASSO 6: Configurar chave do Pagar.me
    print_header "PASSO 6: CONFIGURAR CHAVE DO PAGAR.ME"
    
    echo -e "${YELLOW}⚠️  IMPORTANTE: Você precisará da sua chave API secreta do Pagar.me!${NC}"
    echo ""
    
    read -p "🔑 Digite sua chave API do Pagar.me: " -s PAGARME_API_KEY
    echo ""
    
    if [ -z "$PAGARME_API_KEY" ]; then
        print_error "Chave API não pode estar vazia!"
        exit 1
    fi
    
    print_info "Configurando chave do Pagar.me..."
    if run_supabase secrets set PAGARME_API_KEY="$PAGARME_API_KEY"; then
        print_status "Chave do Pagar.me configurada com sucesso"
    else
        print_error "Erro ao configurar chave do Pagar.me"
        exit 1
    fi
    
    echo ""
    print_info "Secrets configurados:"
    run_supabase secrets list
    
    echo ""
    confirm_action "Verificou que a chave foi configurada? Pode continuar?"
    echo ""
    
    # PASSO 7: Limpar pastas antigas
    print_header "PASSO 7: LIMPANDO PASTAS ANTIGAS"
    
    local FUNCTIONS_DIR="supabase/functions"
    
    if [ ! -d "$FUNCTIONS_DIR" ]; then
        print_warning "Diretório $FUNCTIONS_DIR não encontrado"
    else
        local old_folders=(
            "create-checkout-session"
            "create-event-product"
            "create-payment-intent"
            "create-subscription"
            "get-customer-portal"
            "refund-payment"
            "stripe-webhook"
        )
        
        for folder in "${old_folders[@]}"; do
            local full_path="$FUNCTIONS_DIR/$folder"
            if [ -d "$full_path" ]; then
                print_info "Removendo pasta $folder..."
                rm -rf "$full_path"
                print_status "$folder removida"
            else
                print_warning "$folder não encontrada"
            fi
        done
        
        echo ""
        print_info "Pastas restantes:"
        ls -la "$FUNCTIONS_DIR"
    fi
    
    echo ""
    confirm_action "Verificou que as pastas antigas foram removidas? Pode continuar?"
    echo ""
    
    # PASSO 8: Resumo final
    print_header "CONFIGURAÇÃO COMPLETA!"
    
    echo -e "${GREEN}🎉 PARABÉNS! Configuração concluída com sucesso!${NC}"
    echo ""
    echo "✅ Functions antigas do Stripe REMOVIDAS"
    echo "✅ Functions novas do Pagar.me DEPLOYADAS"
    echo "✅ Chave do Pagar.me CONFIGURADA"
    echo "✅ Pastas antigas LIMPAS"
    echo "✅ Sistema pronto para uso!"
    echo ""
    
    print_section "PRÓXIMOS PASSOS"
    echo "1. 🧪 Testar as functions no frontend"
    echo "2. 🔗 Configurar webhooks se necessário"
    echo "3. 💳 Testar pagamentos com cartão e PIX"
    echo "4. 📚 Consultar documentação: README_ARQUITETURA_SEGURA.md"
    echo ""
    
    print_section "SCRIPTS DISPONÍVEIS"
    echo "📁 Pasta scripts/ contém:"
    echo "   - setup-pagarme-complete.sh (este script)"
    echo "   - setup-pagarme-windows.ps1 (PowerShell)"
    echo "   - remove-stripe-functions.sh (limpeza Stripe)"
    echo "   - cleanup-old-folders.sh (limpeza pastas)"
    echo ""
    
    print_section "TESTE RÁPIDO"
    echo "Para testar se tudo está funcionando:"
    echo "1. Vá para a pasta do projeto"
    echo "2. Execute: npm run dev"
    echo "3. Teste o checkout com cartão ou PIX"
    echo ""
    
    echo -e "${GREEN}🚀 Sistema Pagar.me configurado e pronto para uso!${NC}"
    echo ""
}

# Função para mostrar ajuda
show_help() {
    echo "Uso: $0 [opções]"
    echo ""
    echo "Opções:"
    echo "  -h, --help     Mostra esta ajuda"
    echo "  -y, --yes      Executa sem confirmações (modo automático)"
    echo "  -v, --version  Mostra versão do script"
    echo ""
    echo "Exemplos:"
    echo "  $0              # Execução interativa"
    echo "  $0 --yes        # Execução automática"
    echo "  $0 --help       # Mostra ajuda"
    echo ""
}

# Função para mostrar versão
show_version() {
    echo "setup-pagarme-complete.sh v1.0.0"
    echo "Configurador completo para integração Pagar.me"
    echo "Compatível com Supabase + React + Vite"
}

# Função para modo automático
auto_mode() {
    echo -e "${YELLOW}🤖 MODO AUTOMÁTICO ATIVADO${NC}"
    echo "Todas as confirmações serão respondidas automaticamente com 'sim'"
    echo ""
    
    # Redefinir função confirm_action para modo automático
    confirm_action() {
        local message="$1"
        echo -e "${YELLOW}$message${NC}"
        echo -e "${GREEN}✅ Resposta automática: SIM${NC}"
        return 0
    }
}

# Processar argumentos da linha de comando
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--version)
            show_version
            exit 0
            ;;
        -y|--yes)
            auto_mode
            shift
            ;;
        *)
            print_error "Opção desconhecida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Verificar se está sendo executado no diretório correto
if [ ! -f "package.json" ] && [ ! -d "supabase" ]; then
    print_error "Este script deve ser executado no diretório raiz do projeto!"
    echo "Certifique-se de estar na pasta que contém package.json e supabase/"
    exit 1
fi

# Executar função principal
main "$@"
