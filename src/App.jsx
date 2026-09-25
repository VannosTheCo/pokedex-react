import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export default function PokemonSearch() {
  const [searchInput, setSearchInput] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [pokemonList, setPokemonList] = useState([]);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [displayCount, setDisplayCount] = useState(20);
  
  const dropdownRef = useRef(null);
  const cursorRef = useRef(null);

  useEffect(() => {
    setDisplayCount(20);
  }, [searchInput, selectedType]);

  useEffect(() => {
    const moveCursor = (e) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      }
    };
    const handleMouseOver = (e) => {
      const isClickable = e.target.closest('button, .pokemon-card, .dropdown-item, .pokeball-toggle, input, .card-close-btn, .dropdown-trigger-wrapper, .theme-toggle, .load-more-btn');
      if (cursorRef.current) {
        if (isClickable) {
          cursorRef.current.classList.add('hovering');
        } else {
          cursorRef.current.classList.remove('hovering');
        }
      }
    };
    
    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseover', handleMouseOver);
    
    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [isDarkMode]);

  useEffect(() => {
    let isMounted = true;
    let hasTimedOut = false;

    const timeoutId = setTimeout(() => {
      if (isMounted) {
        hasTimedOut = true;
        setLoadError(true);
        setIsLoading(false);
      }
    }, 30000);

    const fetchPokemons = async () => {
      try {
        const response = await axios.get('https://pokeapi.co/api/v2/pokemon?limit=10000');
        const allRefs = response.data.results;
        
        // Fetch first batch quickly
        const firstBatch = allRefs.slice(0, 40);
        const firstPromises = firstBatch.map(p => axios.get(p.url));
        const firstResults = await Promise.all(firstPromises);
        
        if (!isMounted || hasTimedOut) return;
        clearTimeout(timeoutId);

        const firstData = firstResults.map(res => res.data);
        setPokemonList(firstData);
        setIsLoading(false);
        
        // Background loading for the rest
        let currentData = [...firstData];
        for (let i = 40; i < allRefs.length; i += 100) {
          const chunk = allRefs.slice(i, i + 100);
          const chunkPromises = chunk.map(p => axios.get(p.url).catch(() => null));
          const chunkResults = await Promise.all(chunkPromises);
          
          if (!isMounted) return;
          const chunkData = chunkResults.filter(res => res !== null).map(res => res.data);
          currentData = [...currentData, ...chunkData];
          setPokemonList(currentData);
        }
      } catch (error) {
        console.error("Error fetching pokemons:", error);
        if (isMounted) setIsLoading(false);
      }
    };

    fetchPokemons();
    return () => { isMounted = false; };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
  };

  const filteredPokemon = pokemonList.filter(pokemon => {
    const matchesName = pokemon.name.toLowerCase().includes(searchInput.toLowerCase());
    const matchesType = selectedType === '' || pokemon.types.some(t => t.type.name === selectedType);
    return matchesName && matchesType;
  });

  const displayedPokemon = filteredPokemon.slice(0, displayCount);

  const allTypes = [...new Set(pokemonList.flatMap(p => p.types.map(t => t.type.name)))].sort();

  return (
    <>
      <div className="custom-cursor" ref={cursorRef}>
        <div className="cursor-pokeball"></div>
      </div>
      <div className="app-container">
      <h2 className="pixel-title">Pokédex</h2>
      <form className="search-section" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Enter a Pokémon name"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <div className="custom-dropdown-container" ref={dropdownRef} style={{ position: 'relative', zIndex: 9999 }}>
          <div className="dropdown-trigger-wrapper" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <div className={`pokeball-toggle ${isDropdownOpen ? 'open' : ''}`}>
              <div className="pokeball-center"></div>
            </div>
            <span className={`selected-type-label ${selectedType ? 'bg-type-' + selectedType : ''}`}>
              {selectedType ? selectedType.charAt(0).toUpperCase() + selectedType.slice(1) : 'All Types'}
            </span>
          </div>
          {isDropdownOpen && (
            <div className="custom-dropdown-menu" style={{ zIndex: 9999, position: 'absolute' }}>
              <div
                className="dropdown-item"
                onClick={() => { setSelectedType(''); setIsDropdownOpen(false); }}
              >
                All Types
              </div>
              {allTypes.map(type => (
                <div
                  key={type}
                  className={`dropdown-item bg-type-${type}`}
                  onClick={() => { setSelectedType(type); setIsDropdownOpen(false); }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className={`theme-toggle ${isDarkMode ? 'dark' : 'light'}`}
          onClick={() => setIsDarkMode(!isDarkMode)}
          title="Toggle Theme"
        >
          <img src={isDarkMode ? 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/197.png' : 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/196.png'} alt="Theme Icon" className="theme-icon-img" />
        </button>
      </form>

      {isLoading ? (
        <div className="loader-container">
          <div className="css-pokeball"></div>
          <p className="loader-text">Loading Pokémons...</p>
        </div>
      ) : loadError ? (
        <div className="empty-state-container">
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/104.png" alt="Sad Pokemon" className="sad-pokemon" />
          <p className="loader-text">Pokémons cannot load</p>
        </div>
      ) : filteredPokemon.length === 0 ? (
        <div className="empty-state-container">
          <div className="pixel-box"></div>
          <p className="loader-text">Pokémons are not loaded</p>
        </div>
      ) : (
        <div className="pokedex-grid">
          {displayedPokemon.map((pokemon) => (
            <div
              key={pokemon.id}
              className={`pokemon-card border-type-${pokemon.types[0].type.name}`}
              onClick={() => setSelectedPokemon(pokemon)}
            >
              <div className={`pokemon-img-wrapper bg-type-${pokemon.types[0].type.name}`}>
                <img
                  className="pokemon-img"
                  src={pokemon.sprites.front_default}
                  alt={pokemon.name}
                />
              </div>
              <p className="pokemon-id">
                #{String(pokemon.id).padStart(3, '0')}
              </p>
              <h2 className="pokemon-name">{pokemon.name}</h2>
              <div className="types-container">
                {pokemon.types.map((typeInfo) => (
                  <span
                    key={typeInfo.type.name}
                    className={`type-badge bg-type-${typeInfo.type.name}`}
                  >
                    {typeInfo.type.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !loadError && displayCount < filteredPokemon.length && (
        <div className="load-more-container" style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
          <button 
            className="load-more-btn" 
            onClick={() => setDisplayCount(prev => prev + 20)}
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#e3350d',
              color: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s, background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#cc2f0b'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#e3350d'}
          >
            Load More Pokémon
          </button>
        </div>
      )}

      {selectedPokemon && (
        <div className="card-overlay" onClick={() => setSelectedPokemon(null)}>
          <div className={`card-content border-type-${selectedPokemon.types[0].type.name}`} onClick={(e) => e.stopPropagation()}>
            <button className="card-close-btn" onClick={() => setSelectedPokemon(null)}>
              &times;
            </button>
            <div className="card-header">
              <div className={`card-img-wrapper bg-type-${selectedPokemon.types[0].type.name}`}>
                <img
                  className="card-img"
                  src={selectedPokemon.sprites.front_default}
                  alt={selectedPokemon.name}
                />
              </div>
              <div className="card-title">
                <p className="pokemon-id">#{String(selectedPokemon.id).padStart(3, '0')}</p>
                <h2 className="pokemon-name">{selectedPokemon.name}</h2>
                <div className="types-container">
                  {selectedPokemon.types.map((typeInfo) => (
                    <span
                      key={typeInfo.type.name}
                      className={`type-badge bg-type-${typeInfo.type.name}`}
                    >
                      {typeInfo.type.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className={`card-stats bg-type-${selectedPokemon.types[0].type.name}`}>
              <div className="stat-group-inline">
                <div className="stat-pill">
                  <span className="stat-label">Height:</span>
                  <span className="stat-value">{selectedPokemon.height / 10} m</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-label">Weight:</span>
                  <span className="stat-value">{selectedPokemon.weight / 10} kg</span>
                </div>
              </div>
              <div className="stats-section">
                <span className="stat-section-title">Base Stats</span>
                <div className="stats-bars-list">
                  {selectedPokemon.stats.map(stat => (
                    <div key={stat.stat.name} className="stat-bar-row">
                      <span className="stat-name">{stat.stat.name.replace('-', ' ')}</span>
                      <div className="stat-bar-wrapper">
                        <span className="stat-num">{String(stat.base_stat).padStart(3, '0')}</span>
                        <div className="stat-bar-bg">
                          <div
                            className="stat-bar-fill"
                            style={{ width: `${Math.min(100, (stat.base_stat / 255) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}