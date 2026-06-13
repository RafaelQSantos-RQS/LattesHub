UPDATE producoes 
SET doi = 'NÃO INFORMADO' 
WHERE doi IN (
    'N├âO INFORMADO', 
    'N├ÂO INFORMADO', 
    'NAO INFORMADO', 
    'NÂO INFORMADO',
    'NÃ£O INFORMADO'
);