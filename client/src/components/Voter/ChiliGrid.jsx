import React from 'react';
import { mediaUrl } from '../../services/api';

const ChiliGrid = ({ chilis, votedChiliIds, onChiliSelect, isVotingOpen, judgeName }) => {
  if (!chilis || chilis.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-6xl mb-4 block">🌶️</span>
        <h3 className="text-xl font-medium text-gray-900 mb-2">No Chili Entries Yet</h3>
        <p className="text-gray-500">Chili entries will appear here once they&rsquo;re added by the admin.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {chilis.map((chili) => {
        const isVoted = votedChiliIds.includes(chili.id);
        const hasVotes = chili.vote_count > 0;
        const avgScore = chili.avg_overall;

        return (
          <div
            key={chili.id}
            className={`chili-card overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-105 ${
              isVoted ? 'ring-2 ring-green-500' : ''
            } ${!isVotingOpen ? 'opacity-75' : ''}`}
            onClick={() => {
              if (isVotingOpen && judgeName) {
                onChiliSelect(chili);
              }
            }}
          >
            {/* Chili Image */}
            <div className="aspect-w-16 aspect-h-12 bg-gray-200">
              {chili.image_path ? (
                <img
                  src={mediaUrl(chili.image_path)}
                  alt={chili.name}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBDOTQuNDc3MSA3MCA5MCA3NC40NzcxIDkwIDgwVjEyMEM5MCAxNS41MjI5IDk0LjQ3NzEgMTIwIDEwMCAxMjBDMTA1LjUyMyAxMjAgMTEwIDExNS41MjMgMTEwIDEyMFY4MEMxMTAgNzQuNDc3MSAxMDUuNTIzIDcwIDEwMCA3MFoiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+';
                  }}
                />
              ) : (
                <div className="w-full h-48 bg-gray-300 flex items-center justify-center">
                  <span className="text-4xl">🌶️</span>
                </div>
              )}
            </div>

            {/* Chili Info */}
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg text-gray-900 truncate">{chili.name}</h3>
                {isVoted && (
                  <div className="ml-2 flex-shrink-0">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600 mb-1">by {chili.contestant_name}</p>
              
              {chili.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{chili.description}</p>
              )}

              {/* Vote Stats */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">
                  {hasVotes ? `${chili.vote_count} vote${chili.vote_count === 1 ? '' : 's'}` : 'No votes yet'}
                </span>
                
                {hasVotes && (
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-medium text-gray-700">{avgScore}</span>
                  </div>
                )}
              </div>

              {/* Vote Button */}
              {!isVotingOpen ? (
                <div className="mt-3 text-center">
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    Voting Closed
                  </span>
                </div>
              ) : isVoted ? (
                <div className="mt-3 text-center">
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                    Voted
                  </span>
                </div>
              ) : !judgeName ? (
                <div className="mt-3 text-center">
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    Enter name to vote
                  </span>
                </div>
              ) : (
                <div className="mt-3">
                  <button className="vote-button w-full text-sm py-2">
                    Rate This Chili
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChiliGrid;
