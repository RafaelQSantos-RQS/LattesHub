import zipfile
import os

def extrair_e_converter_lattes(caminho_zip, pasta_destino):
    # Garante que a pasta de destino existe
    os.makedirs(pasta_destino, exist_ok=True)
    
    with zipfile.ZipFile(caminho_zip, 'r') as z:
        for nome_arquivo_zip in z.namelist():
            # Ignora se for apenas uma pasta dentro do zip
            if nome_arquivo_zip.endswith('.xml'):
                # 1. Lê os bytes crus e intocados de dentro do ZIP
                bytes_originais = z.read(nome_arquivo_zip)
                
                # 2. Decodifica usando o padrão real do Lattes (Windows-1252)
                try:
                    texto_limpo = bytes_originais.decode('windows-1252')
                except UnicodeDecodeError:
                    # Fallback de segurança
                    texto_limpo = bytes_originais.decode('iso-8859-1', errors='replace')
                
                # 3. Altera o cabeçalho do XML para refletir a nova realidade
                texto_limpo = texto_limpo.replace('encoding="ISO-8859-1"', 'encoding="UTF-8"')
                
                # --- A CORREÇÃO ESTÁ AQUI ---
                # Pega apenas o nome do arquivo (ex: '6716225567627323.xml'), ignorando pastas internas
                apenas_nome_arquivo = os.path.basename(nome_arquivo_zip)
                
                # 4. Salva o novo arquivo XML como UTF-8 puro
                caminho_saida = os.path.join(pasta_destino, apenas_nome_arquivo)
                
                with open(caminho_saida, 'w', encoding='utf-8') as f:
                    f.write(texto_limpo)
                
                print(f"Sucesso: {apenas_nome_arquivo} convertido para UTF-8 sem perdas.")

# Exemplo de uso:
extrair_e_converter_lattes('./database/data/lattesNAPI.zip', './dados_limpos/')