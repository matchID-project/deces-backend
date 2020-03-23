if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&firstName=Harry | grep -q 'Harry'; then
    echo "firstName: OK"
else
    echo -e "\e[31mfirstName: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&lastName=Pottier | grep -q 'Pottier'; then
    echo "lastName: OK"
else
    echo -e "\e[31mlastName: KO!\e[0m"
    exit 1
fi
if curl -s  -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&birthCountry=France | grep -q 'France'; then
    echo "birthCountry: OK"
else
    echo -e "\e[31mbirthCountry: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&deathCountry=Colombie | grep -q 'Colombie'; then
    echo "deathCountry: OK"
else
    echo -e "\e[31mdeathCountry: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&birthDate=28/03/1930 | grep -q '19300328'; then
    echo "birthDate: OK"
else
    echo -e "\e[31mbirthDate: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=22/02/1970 | grep -q '19700222'; then
    echo "deathDate: OK"
else
    echo -e "\e[31mdeathDate: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&birthCity=Metz | grep -q 'Metz'; then
    echo "birthCity: OK"
else
    echo -e "\e[31mbirthCity: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&deathCity=Nice | grep -q 'Nice'; then
    echo "deathCity: OK"
else
    echo -e "\e[31mdeathCity: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&birthDepartment=57 | grep -q '57'; then
    echo "birthDepartment: OK"
else
    echo -e "\e[31mbirthDepartement: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&deathDepartment=75 | grep -q '75'; then
    echo "deathDepartment: OK"
else
    echo -e "\e[31mdeathDepartement: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&firstName=Ana\&fuzzy=false | grep -q '"hits":{"total":{"value":2' ; then
    echo "fuzzy: OK"
else
    echo -e "\e[31mfuzzy: KO!\e[0m"
    exit 1
fi
if curl -s -XGET http://localhost:${BACKEND_PORT}/deces/api/v1/search?deathDate=1970\&lastName=Georges%20Bosq | grep -q 'Bosq' ; then
    echo "fullText: OK"
else
    echo -e "\e[31mfullText: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","firstName": "Harry"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'Harry'; then
    echo "firstName: OK"
else
    echo -e "\e[31mfirstName: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","lastName": "Pottier"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'Pottier'; then
    echo "lastName: OK"
else
    echo -e "\e[31mlastName: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","birthCountry": "France"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'France'; then
    echo "birthCountry: OK"
else
    echo -e "\e[31mbirthCountry: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","deathCountry": "Colombie"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'Colombie'; then
    echo "deathCountry: OK"
else
    echo -e "\e[31mdeathCountry: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","birthDate": "28/03/1930"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q '19300328'; then
    echo "birthDate: OK"
else
    echo -e "\e[31mbirthDate: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate": "22/02/1970"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q '19700222'; then
    echo "deathDate: OK"
else
    echo -e "\e[31mdeathDate: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","birthCity": "Metz"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'Metz'; then
    echo "birthCity: OK"
else
    echo -e "\e[31mbirthCity: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","deathCity": "Nice"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'Nice'; then
    echo "deathCity: OK"
else
    echo -e "\e[31mdeathCity: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","birthDepartment": "57"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q '57'; then
    echo "birthDepartment: OK"
else
    echo -e "\e[31mbirthDepartement: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","deathDepartment": "75"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q '75'; then
    echo "deathDepartment: OK"
else
    echo -e "\e[31mdeathDepartement: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","firstName": "Ana", "fuzzy": "false"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q '"hits":{"total":{"value":2'; then
    echo "fuzzy: OK"
else
    echo -e "\e[31mfuzzy: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","lastName": "Bosq"}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'Bosq'; then
    echo "fullText: OK"
else
    echo -e "\e[31mfullText: KO!\e[0m"
    exit 1
fi
if curl -s -X POST -H "Content-Type: application/json" -d '{"deathDate":"1970","lastName": "Bosq", "sort": [{"firstName": "asc"}]}' http://localhost:${BACKEND_PORT}/deces/api/v1/search | grep -q 'Bosq'; then
    echo "sort: OK"
else
    echo -e "\e[31msort: KO!\e[0m"
    exit 1
fi
