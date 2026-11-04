# -*- coding: utf-8 -*-
"""
Script to create sample Itaú DDC PDF matching the user's document
"""
import sys
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def create_sample_pdf(filename="exemplo-ddc-itau.pdf"):
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter

    # Page 1
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, height - 40, "Itaú")
    c.setFont("Helvetica", 9)
    c.drawString(40, height - 60, "ARTHUR WALLACE SILVA LOPES")
    c.drawString(40, height - 72, "009.341.701-26")
    c.drawString(250, height - 60, "agência: 7929")
    c.drawString(350, height - 60, "conta: 25407-1")
    
    c.setFont("Helvetica-Bold", 11)
    c.drawString(40, height - 95, "Demonstrativo Descritivo de Crédito (DDC) Emitido em 27.10.2026 ás 10:22:45")
    
    c.setFont("Helvetica", 8)
    y = height - 115
    c.drawString(40, y, "Modalidade de Crédito: Taxa fixa")
    c.drawString(300, y, "Taxa de Juros (mensal): 0,963139300%")
    y -= 14
    c.drawString(40, y, "Prazo total operação: 118")
    c.drawString(300, y, "Taxa de Juros (anual): 11,557671600%")
    y -= 14
    c.drawString(40, y, "Prazo remanescente: 98")
    c.drawString(300, y, "Taxa efetiva (anual): 12,190000000%")
    y -= 14
    c.drawString(40, y, "Sistema de pagamento (débito em conta/boleto): Debito Automatico")
    c.drawString(300, y, "Modalidade da Carteira: CARTEIRA HIPOTECARIA")
    y -= 14
    c.drawString(40, y, "Valor da última parcela (no vencimento): R$1.394,02")
    c.drawString(300, y, "Número do contrato: 10194887106")
    y -= 14
    c.drawString(40, y, "Data do vencimento da última parcela: 26/12/2034")
    c.drawString(300, y, "Sistema de amortização: SAC")
    
    y -= 25
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, y, "Demonstrativo da Evolução de Saldo Devedor")
    
    y -= 18
    c.setFont("Helvetica-Bold", 7)
    c.drawString(40, y, "Operação: Implantacao de contrato - Esteira Data: 26/02/2025 Valor da Operação: 228.000,00")
    y -= 9.5
    
    page1_lines = [
        "1 26/03/2025 543,26 2.197,60 1,000750 47,04 33,04 0,00 0,00 0,00 0,00 0,00 0,00 1,000750 0,00 Paga 2.820,94 227.627,74",
        "2 26/04/2025 544,19 2.196,12 1,001709 23,51 16,55 0,00 0,00 0,00 0,00 0,00 0,00 1,001709 0,00 Paga 2.780,37 227.472,57",
        "3 26/05/2025 544,99 2.194,10 1,001469 23,49 16,57 0,00 0,00 0,00 0,00 0,00 0,00 1,001469 0,00 Paga 2.779,15 227.261,74",
        "4 26/06/2025 545,94 2.192,65 1,001736 23,47 16,60 0,00 0,00 0,00 0,00 0,00 0,00 1,001736 0,00 Paga 2.778,66 227.110,33",
        "5 26/07/2025 546,89 2.191,19 1,001739 23,46 16,63 0,00 0,00 0,00 0,00 0,00 0,00 1,001739 0,00 Paga 2.778,17 226.958,38",
        "6 26/08/2025 547,83 2.189,69 1,001722 23,44 16,66 0,00 0,00 0,00 0,00 0,00 0,00 1,001722 0,00 Paga 2.777,62 226.801,37",
        "7 26/09/2025 548,79 2.188,26 1,001760 23,42 16,69 0,00 0,00 0,00 0,00 0,00 0,00 1,001760 0,00 Paga 2.777,16 226.651,75",
        "Operação: Amortizacao reducao de prazo recurso proprio Data: 26/09/2025 Valor da Operação: 1.500,00",
        "Operação: Amortizacao reducao de prazo recurso proprio Data: 29/09/2025 Juros Pró-rata: 0,53 Atualização monetária: 0,10 Valor da Operação: 550,00",
        "Operação: Amortizacao reducao de prazo recurso proprio Data: 01/10/2025 Juros Pró-rata: 1,83 Atualização monetária: 0,33 Valor da Operação: 1.150,00",
        "Operação: Amortizacao reducao de prazo recurso proprio Data: 10/10/2025 Juros Pró-rata: 5,55 Atualização monetária: 0,99 Valor da Operação: 1.243,80",
        "8 26/10/2025 593,60 2.143,94 1,001719 22,95 16,72 0,00 0,00 0,00 0,00 0,00 0,00 1,001719 0,00 Paga 2.777,21 222.005,67",
        "Operação: Amortizacao reducao de prazo recurso proprio Data: 30/10/2025 Juros Pró-rata: 2,22 Atualização monetária: 0,40 Valor da Operação: 1.800,00",
        "9 26/11/2025 612,74 2.124,56 1,001721 22,74 16,75 0,00 0,00 0,00 0,00 0,00 0,00 1,001721 0,00 Paga 2.776,79 219.974,53",
        "Operação: Amortizacao reducao de prazo recurso proprio Data: 04/12/2025 Juros Pró-rata: 3,57 Atualização monetária: 0,64 Valor da Operação: 1.400,00",
        "Operação: Amortizacao reducao de prazo recurso proprio Data: 05/12/2025 Juros Pró-rata: 12,63 Atualização monetária: 2,27 Valor da Operação: 4.400,00",
        "Operação: Amortizacao reducao de prazo recurso proprio Data: 19/12/2025 Juros Pró-rata: 9,88 Atualização monetária: 1,77 Valor da Operação: 1.348,42",
        "10 26/12/2025 683,41 2.053,64 1,001723 21,98 16,78 0,00 0,00 0,00 0,00 0,00 0,00 1,001723 0,00 Paga 2.775,81 212.540,21",
        "Operação: Amortizacao reducao de prazo recurso proprio Data: 29/12/2025 Juros Pró-rata: 3,80 Atualização monetária: 0,68 Valor da Operação: 4.100,00",
        "11 26/01/2026 725,00 2.011,02 1,001699 21,53 16,80 0,00 0,00 0,00 0,00 0,00 0,00 1,001699 0,00 Paga 2.774,35 208.073,84",
        "Operação: Amortizacao reducao de prazo recurso proprio Data: 06/02/2026 Juros Pró-rata: 12,06 Atualização monetária: 2,16 Valor da Operação: 3.550,00",
        "12 26/02/2026 761,67 1.973,37 1,001717 21,12 16,83 0,00 0,00 0,00 0,00 0,00 0,00 1,001717 0,00 Paga 2.772,99 204.127,58",
        "13 26/03/2026 762,96 1.969,36 1,001694 21,08 16,86 0,00 0,00 0,00 0,00 0,00 0,00 1,001694 0,00 Paga 2.770,26 203.710,41",
        "14 26/04/2026 764,25 1.965,32 1,001687 21,04 16,89 0,00 0,00 0,00 0,00 0,00 0,00 1,001687 0,00 Paga 2.767,50 203.289,82",
        "15 26/05/2026 765,54 1.961,27 1,001688 20,99 16,92 0,00 0,00 0,00 0,00 0,00 0,00 1,001688 0,00 Paga 2.764,72 202.867,43",
        "16 26/06/2026 766,86 1.957,27 1,001728 20,95 16,95 0,00 0,00 0,00 0,00 0,00 0,00 1,001728 0,00 Paga 2.762,03 202.451,12",
        "Operação: Amortizacao reducao de prazo recurso proprio Data: 17/07/2026 Juros Pró-rata: 334,36 Atualização monetária: 58,88 Valor da Operação: 50.000,00",
        "17 26/07/2026 1.244,74 1.474,60 1,001696 15,78 16,98 0,00 0,00 0,00 0,00 0,00 0,00 1,001696 0,00 Paga 2.752,10 151.858,84",
        "Operação: Amortizacao reducao de prazo recurso proprio Data: 27/07/2026 Juros Pró-rata: 1,54 Valor da Operação: 5.000,00",
        "18 26/08/2026 1.290,46 1.416,89 1,001713 15,17 17,01 0,00 0,00 0,00 0,00 0,00 0,00 1,001713 0,00 Paga 2.739,53 145.821,49",
        "Operação: Amortizacao reducao de prazo recurso proprio Data: 26/08/2026 Valor da Operação: 1.600,00",
        "Operação: Amortizacao reducao de prazo recurso proprio Data: 27/08/2026 Juros Pró-rata: 0,52 Atualização monetária: 0,09 Valor da Operação: 1.705,24",
        "Operação: Amortizacao reducao de prazo recurso proprio Data: 01/09/2026 Juros Pró-rata: 3,77 Atualização monetária: 0,67 Valor da Operação: 2.036,92",
        "19 26/09/2026 1.353,12 1.355,37 1,001709 14,51 17,04 0,00 0,00 0,00 0,00 0,00 0,00 1,001709 0,00 Paga 2.740,04 139.371,35",
        "Operação: Amortizacao reducao de prazo recurso proprio Data: 13/10/2026 Juros Pró-rata: 15,37 Atualização monetária: 1,63 Valor da Operação: 2.836,92",
        "20 26/10/2026 1.380,72 1.316,53 1,001026 14,09 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,001026 0,00 Paga 2.728,39 135.310,81",
        "21 26/11/2026 1.380,72 1.303,23 1,000000 13,95 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 2.714,95 133.930,09",
        "22 26/12/2026 1.380,72 1.289,93 1,000000 13,81 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 2.701,51 132.549,37",
        "23 26/01/2027 1.380,72 1.276,64 1,000000 13,67 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 2.688,08 131.168,65",
        "24 26/02/2027 1.380,72 1.263,34 1,000000 13,52 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 2.674,63 129.787,93",
        "25 26/03/2027 1.380,72 1.250,04 1,000000 13,38 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 2.661,19 128.407,21",
        "26 26/04/2027 1.380,72 1.236,74 1,000000 13,24 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 2.647,75 127.026,49",
        "27 26/05/2027 1.380,72 1.223,44 1,000000 13,10 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 2.634,31 125.645,77",
        "28 26/06/2027 1.380,72 1.210,14 1,000000 12,95 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 2.620,86 124.265,05",
        "29 26/07/2027 1.380,72 1.196,85 1,000000 12,81 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 2.607,43 122.884,33",
        "30 26/08/2027 1.380,72 1.183,55 1,000000 12,67 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 2.593,99 121.503,61",
        "31 26/09/2027 1.380,72 1.170,25 1,000000 12,53 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 2.580,55 120.122,89",
        "32 26/10/2027 1.380,72 1.156,95 1,000000 12,38 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 2.567,10 118.742,17",
        "33 26/11/2027 1.380,72 1.143,65 1,000000 12,24 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 2.553,66 117.361,45",
        "34 26/12/2027 1.380,72 1.130,35 1,000000 12,10 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 2.540,22 115.980,73",
        "35 26/01/2028 1.380,72 1.117,06 1,000000 11,96 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 2.526,79 114.600,01",
        "36 26/02/2028 1.380,72 1.103,76 1,000000 11,82 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 2.513,35 113.219,29"
    ]
    
    c.setFont("Helvetica", 6.5)
    for line in page1_lines:
        if "Operação:" in line:
            c.setFont("Helvetica-Bold", 6.5)
            c.drawString(40, y, line)
            c.setFont("Helvetica", 6.5)
        else:
            c.drawString(40, y, line)
        y -= 9.5
        if y < 30:
            break
            
    c.showPage()
    
    # Page 2
    y = height - 40
    c.setFont("Helvetica", 6.5)
    for p in range(37, 119):
        # sample line for 37..118
        if p == 118:
            line = f"118 26/12/2034 1.380,72 13,30 1,000000 0,00 0,00 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 1.394,02 0,00"
        else:
            line = f"{p} 26/03/2028 1.380,72 1.090,46 1,000000 11,67 17,05 0,00 0,00 0,00 0,00 0,00 0,00 1,000000 0,00 Projetada 2.499,90 111.838,57"
        c.drawString(40, y, line)
        y -= 8.5
        if y < 40:
            c.showPage()
            y = height - 40
            c.setFont("Helvetica", 6.5)
            
    c.save()
    print("Created", filename)

if __name__ == "__main__":
    create_sample_pdf()
